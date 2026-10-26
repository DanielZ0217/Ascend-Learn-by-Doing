import "server-only";

import { createHash, randomUUID } from "node:crypto";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import type { RoleId, SourceExcerpt } from "@/lib/contracts";
import { recordPassageGraph } from "@/lib/graph";
import { passageToExcerpt, saveDocument, savePassage, type StoredPassage } from "@/lib/storage/db";
import { flushVectors, indexVector } from "./vector";

function compact(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function decodeHtml(value: string) {
  const named: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
  return value.replace(/&(#x[0-9a-f]+|#[0-9]+|[a-z]+);/gi, (_, code: string) => {
    if (code.startsWith("#x")) return String.fromCodePoint(parseInt(code.slice(2), 16));
    if (code.startsWith("#")) return String.fromCodePoint(parseInt(code.slice(1), 10));
    return named[code] ?? " ";
  });
}

export function textFromHtml(html: string): string {
  const chapterStart = html.search(/<section\b[^>]*data-type=["']chapter["'][^>]*>/i);
  const selected = (chapterStart >= 0 ? html.slice(chapterStart) : undefined)
    ?? html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1]
    ?? html.match(/<article\b[^>]*>([\s\S]*?)<\/article>/i)?.[1]
    ?? html;
  return compact(decodeHtml(selected
    .replace(/<(script|style|svg|nav|footer|header)\b[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<\/(p|li|h[1-6]|section|div)>/gi, "\n\n")
    .replace(/<[^>]+>/g, " ")));
}

export async function pagesFromPdf(bytes: Uint8Array): Promise<{ text: string; location: string }[]> {
  const { getDocument, GlobalWorkerOptions } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  GlobalWorkerOptions.workerSrc = pathToFileURL(join(process.cwd(), "node_modules", "pdfjs-dist", "legacy", "build", "pdf.worker.mjs")).href;
  const pdf = await getDocument({ data: bytes, useSystemFonts: true, disableFontFace: true }).promise;
  const pages: { text: string; location: string }[] = [];
  for (let number = 1; number <= Math.min(pdf.numPages, 40); number++) {
    const page = await pdf.getPage(number);
    const content = await page.getTextContent();
    const text = compact(content.items.map((item) => "str" in item ? item.str : "").join(" "));
    if (text.length >= 80) pages.push({ text, location: `Page ${number}` });
  }
  return pages;
}

function chunks(text: string, max = 1300): string[] {
  const words = compact(text).split(" ");
  const result: string[] = [];
  let current = "";
  for (const word of words) {
    if (current.length + word.length + 1 > max && current.length > 0) {
      result.push(current);
      current = "";
    }
    current += `${current ? " " : ""}${word}`;
  }
  if (current.length >= 60) result.push(current);
  return result;
}

export async function ingestContent(args: {
  companyId: string | null;
  roleId: RoleId | null;
  title: string;
  url?: string;
  kind: "pdf" | "text" | "web";
  bytes?: Uint8Array;
  text?: string;
  uploaded: boolean;
  maxPassages?: number;
}): Promise<{ documentId: string; passageCount: number; sources: SourceExcerpt[]; mode: "indexed" | "local"; graph: "recorded" | "unavailable" }> {
  const documentId = args.uploaded ? randomUUID() : createHash("sha256").update(args.url ?? args.title).digest("hex").slice(0, 28);
  let sections: { text: string; location: string }[];
  if (args.kind === "pdf") {
    if (!args.bytes) throw new Error("PDF data is missing.");
    sections = await pagesFromPdf(args.bytes);
  } else {
    const content = args.kind === "web" ? textFromHtml(args.text ?? "") : compact(args.text ?? "");
    sections = [{ text: content, location: args.kind === "web" ? "Web page" : "Uploaded text" }];
  }
  const passageRows = sections.flatMap((section) => chunks(section.text).map((text, index) => ({ text, location: `${section.location}, part ${index + 1}` }))).slice(0, args.maxPassages ?? 24);
  if (!passageRows.length) throw new Error("No selectable text was found in the source.");
  saveDocument({ id: documentId, companyId: args.companyId, roleId: args.roleId,
    title: args.title, url: args.url ?? null, kind: args.kind, uploaded: args.uploaded });
  const sources: SourceExcerpt[] = [];
  let indexed = 0;
  let graphCount = 0;
  for (let index = 0; index < passageRows.length; index++) {
    const row = passageRows[index];
    const passage: StoredPassage = { id: `${documentId}-${index + 1}`, documentId,
      companyId: args.companyId, roleId: args.roleId, title: args.title, url: args.url ?? null,
      location: row.location, text: row.text, uploaded: args.uploaded };
    savePassage(passage);
    sources.push(passageToExcerpt(passage));
    try { await recordPassageGraph({ passageId: passage.id, documentId, roleId: args.roleId,
      companyId: args.companyId, title: args.title }); graphCount++; } catch { /* Report in result. */ }
    try { await indexVector(passage.id, passage.text); indexed++; } catch { /* FTS retains text. */ }
  }
  if (indexed === passageRows.length) {
    try { await flushVectors(); } catch { indexed = 0; }
  }
  return { documentId, passageCount: passageRows.length, sources: sources.slice(0, 8),
    mode: indexed === passageRows.length ? "indexed" : "local",
    graph: graphCount === passageRows.length ? "recorded" : "unavailable" };
}

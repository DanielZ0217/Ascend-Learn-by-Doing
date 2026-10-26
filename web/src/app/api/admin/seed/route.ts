import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { curatedSources } from "@/lib/retrieval/catalog";
import { ingestContent } from "@/lib/retrieval/ingest";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const host = new URL(request.url).hostname;
  if (host !== "127.0.0.1" && host !== "localhost") return Response.json({ error: "Local only." }, { status: 403 });
  const results: { roleId: string; title: string; passages?: number; mode?: string; graph?: string; error?: string }[] = [];
  const dir = join(process.cwd(), "data", "sources");
  await mkdir(dir, { recursive: true });
  for (const [index, source] of curatedSources.entries()) {
    try {
      const file = join(dir, `${index + 1}-${source.roleId}.${source.kind === "pdf" ? "pdf" : "html"}`);
      let bytes: Uint8Array;
      try { bytes = new Uint8Array(await readFile(file)); }
      catch {
        const response = await fetch(source.url, { signal: AbortSignal.timeout(20000),
          headers: { "User-Agent": "HACKTX-Learning-Prototype/0.1 (local educational demo)" } });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        bytes = new Uint8Array(await response.arrayBuffer());
        await writeFile(file, bytes);
      }
      if (bytes.length > 10_000_000) throw new Error("Source exceeds 10 MB.");
      const ingested = await ingestContent({ companyId: null, roleId: source.roleId,
        title: source.title, url: source.url, kind: source.kind,
        ...(source.kind === "pdf" ? { bytes } : { text: new TextDecoder().decode(bytes) }),
        uploaded: false, maxPassages: 6 });
      results.push({ roleId: source.roleId, title: source.title,
        passages: ingested.passageCount, mode: ingested.mode, graph: ingested.graph });
    } catch (error) {
      results.push({ roleId: source.roleId, title: source.title,
        error: error instanceof Error ? error.message.slice(0, 160) : "Source unavailable" });
    }
  }
  return Response.json({ results, successful: results.filter((item) => item.passages).length });
}

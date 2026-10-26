import "server-only";

import { createHash } from "node:crypto";
import type { RoleId, SourceExcerpt } from "@/lib/contracts";
import { getConnectedPassageIds } from "@/lib/graph";
import { getPassage, passageToExcerpt, searchLocalPassages, type StoredPassage } from "@/lib/storage/db";
import { searchVectors } from "./vector";

function eligible(passage: StoredPassage, companyId: string, roleId: RoleId) {
  return (!passage.companyId || passage.companyId === companyId)
    && (!passage.roleId || passage.roleId === roleId);
}

function expandedTopic(roleId: RoleId, topic: string) {
  if (roleId !== "software-engineer") return topic;
  if (/aggregat|group|category|summari[sz]|count|\barray\b/i.test(topic)) {
    return `${topic} JavaScript Map category counts array aggregation`;
  }
  if (/dedup|duplicate|unique|hash|\bmap\b|\bset\b/i.test(topic)) {
    return `${topic} JavaScript Map Set unique id key insertion order`;
  }
  if (/overload|traffic|queue|load|server/i.test(topic)) {
    return `${topic} handling overload load shedding capacity requests`;
  }
  return topic;
}

function diversify(passages: StoredPassage[], limit: number) {
  const seen = new Set<string>();
  const perDocument = new Map<string, number>();
  const result: StoredPassage[] = [];
  for (const passage of passages) {
    if (seen.has(passage.id) || (perDocument.get(passage.documentId) ?? 0) >= 3) continue;
    seen.add(passage.id);
    perDocument.set(passage.documentId, (perDocument.get(passage.documentId) ?? 0) + 1);
    result.push(passage);
    if (result.length >= limit) break;
  }
  return result;
}

export async function retrieveLearningContext(args: {
  companyId: string; roleId: RoleId; topic: string; limit?: number;
}): Promise<{ sources: SourceExcerpt[]; engine: "milvus" | "fts" | "none" }> {
  const limit = Math.min(args.limit ?? 5, 8);
  const query = expandedTopic(args.roleId, args.topic);
  let graphIds: Set<string> | null = null;
  try { graphIds = new Set(await getConnectedPassageIds({ ...args, limit: 100 })); } catch { /* Graph status is reported separately. */ }
  try {
    const ids = await searchVectors(query, 30);
    const passages = ids.map(getPassage).filter((p): p is StoredPassage => Boolean(p))
      .filter((p) => eligible(p, args.companyId, args.roleId));
    const lexical = searchLocalPassages({ ...args, topic: query, limit: 8 });
    const ranked = graphIds ? [
      ...passages.filter((p) => graphIds!.has(p.id)),
      ...passages.filter((p) => !graphIds!.has(p.id)),
    ] : passages;
    if (ranked.length === 0) {
      const local = searchLocalPassages(args);
      return { sources: local.slice(0, limit).map(passageToExcerpt),
        engine: local.length ? "fts" : "none" };
    }
    return { sources: diversify([...lexical.slice(0, 2), ...ranked, ...lexical], limit).map(passageToExcerpt), engine: "milvus" };
  } catch {
    const passages = searchLocalPassages(args);
    return { sources: passages.slice(0, limit).map(passageToExcerpt),
      engine: passages.length ? "fts" : "none" };
  }
}

export async function retrievePassages(args: {
  companyId: string; roleId: RoleId; topic: string; limit?: number;
}): Promise<SourceExcerpt[]> {
  return (await retrieveLearningContext(args)).sources;
}

const cache = new Map<string, { at: number; sources: SourceExcerpt[] }>();
export async function researchEngineering(args: {
  companyId: string; topic: string; limit?: number;
}): Promise<{ sources: SourceExcerpt[]; mode: "live" | "cached" | "unavailable" }> {
  const key = process.env.SERPAPI_API_KEY;
  if (!key) return { sources: [], mode: "unavailable" };
  const query = `software engineering ${args.topic} official documentation tutorial`;
  const cached = cache.get(query);
  if (cached && Date.now() - cached.at < 86400000) {
    return { sources: cached.sources.map((source) => ({ ...source, provenance: "cached" })), mode: "cached" };
  }
  const url = new URL("https://serpapi.com/search.json");
  url.searchParams.set("engine", "google");
  url.searchParams.set("q", query);
  url.searchParams.set("num", String(Math.min(args.limit ?? 2, 3)));
  url.searchParams.set("api_key", key);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(url, { signal: controller.signal, cache: "no-store" });
    if (!response.ok) {
      console.warn("[research] SerpApi HTTP status", response.status);
      return { sources: [], mode: "unavailable" };
    }
    const payload = await response.json() as { organic_results?: { title?: string; link?: string; snippet?: string }[] };
    const sources = (payload.organic_results ?? []).flatMap((item) => {
      if (!item.title || !item.link || !item.snippet) return [];
      try {
        const linked = new URL(item.link);
        if (linked.protocol !== "https:") return [];
      } catch { return []; }
      return [{ id: createHash("sha256").update(item.link).digest("hex").slice(0, 28),
        title: item.title.slice(0, 1000), url: item.link, excerpt: item.snippet.slice(0, 12000),
        location: "Search result summary", retrievedAt: new Date().toISOString(),
        provenance: "live" as const }];
    }).slice(0, Math.min(args.limit ?? 2, 3));
    cache.set(query, { at: Date.now(), sources });
    return { sources, mode: "live" };
  } catch (error) {
    console.warn("[research] SerpApi transport", error instanceof Error ? error.name : "unknown");
    return { sources: [], mode: "unavailable" };
  }
  finally { clearTimeout(timer); }
}

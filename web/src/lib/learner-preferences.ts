import "server-only";

import { createHash, randomBytes } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import { initStage2 } from "@/lib/stage2/store";
import { getDb } from "@/lib/storage/db";

const cookieName = "hacktx_learner";
const cookiePattern = /^[A-Za-z0-9_-]{43}$/;
const digest = (value: string) => createHash("sha256").update(value).digest("hex");

export function learnerIdentity(request: Request) {
  const raw = request.headers.get("cookie")?.split(";").map((part) => part.trim())
    .find((part) => part.startsWith(`${cookieName}=`))?.slice(cookieName.length + 1) ?? "";
  const existing = cookiePattern.test(raw);
  const token = existing ? raw : randomBytes(32).toString("base64url");
  const secure = request.url.startsWith("https:") || request.headers.get("x-forwarded-proto") === "https";
  return {
    key: digest(token),
    setCookie: existing ? null : `${cookieName}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=2592000${secure ? "; Secure" : ""}`,
  };
}

/** Save only an explicit, bounded explanation style; never store arbitrary chat instructions. */
export function lastingLearningStyle(message: string): string | null {
  if (!/\b(?:from now on|always|every time|remember|going forward|in future|for all (?:my )?(?:coaches|roles))\b/i.test(message)) return null;
  const analogy = message.match(/\b(?:using|with|through|via)\s+([a-z][a-z0-9 -]{0,39}?)\s+analog(?:y|ies)\b/i)
    ?? message.match(/\b([a-z][a-z0-9 -]{0,39}?)\s+analog(?:y|ies)\b/i);
  if (analogy) {
    const theme = analogy[1].trim().replace(/^(?:use|using|with|some|the)\s+/i, "").trim();
    if (theme && theme.length <= 40) return `Use ${theme} analogies when explaining concepts.`;
  }
  if (/\bstep[- ]by[- ]step\b/i.test(message)) return "Explain ideas step by step and check my understanding between steps.";
  if (/\b(?:simple terms|plain language|plain english)\b/i.test(message)) return "Use simple, plain language when explaining concepts.";
  return null;
}

export function getLearningStyle(companyId: string, learnerKey: string, db: DatabaseSync = getDb()): string | null {
  initStage2(db);
  const row = db.prepare("SELECT style FROM learner_preferences WHERE company_id = ? AND learner_hash = ?")
    .get(companyId, learnerKey) as { style: string } | undefined;
  return row?.style ?? null;
}

export function saveLearningStyle(companyId: string, learnerKey: string, style: string, db: DatabaseSync = getDb()): void {
  initStage2(db);
  db.prepare(`INSERT INTO learner_preferences (company_id, learner_hash, style, updated_at) VALUES (?, ?, ?, ?)
    ON CONFLICT(company_id, learner_hash) DO UPDATE SET style = excluded.style, updated_at = excluded.updated_at`)
    .run(companyId, learnerKey, style.slice(0, 160), new Date().toISOString());
}

export function removeLearningStyle(companyId: string, learnerKey: string, db: DatabaseSync = getDb()): void {
  initStage2(db);
  db.prepare("DELETE FROM learner_preferences WHERE company_id = ? AND learner_hash = ?").run(companyId, learnerKey);
}

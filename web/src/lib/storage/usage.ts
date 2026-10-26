import "server-only";

import { randomUUID } from "node:crypto";
import { getDb } from "./db";

export async function getEstimatedAiSpend(provider?: string): Promise<number> {
  const row = provider
    ? getDb().prepare("SELECT COALESCE(SUM(estimated_usd), 0) AS total FROM ai_usage WHERE provider = ?").get(provider) as { total: number }
    : getDb().prepare("SELECT COALESCE(SUM(estimated_usd), 0) AS total FROM ai_usage").get() as { total: number };
  return Number(row.total);
}

export async function recordAiUsage(entry: {
  provider: string;
  model: string;
  operation: string;
  inputTokens: number;
  outputTokens: number;
  estimatedUsd: number;
}): Promise<number> {
  getDb().prepare(`INSERT INTO ai_usage (id, provider, model, operation, input_tokens, output_tokens, estimated_usd, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(randomUUID(), entry.provider, entry.model,
    entry.operation, entry.inputTokens, entry.outputTokens,
    Math.max(0, entry.estimatedUsd), new Date().toISOString());
  return getEstimatedAiSpend();
}

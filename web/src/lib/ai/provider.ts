import "server-only";

import { z } from "zod";
import { getServerEnvironment } from "@/lib/config";
import { getEstimatedAiSpend, recordAiUsage } from "@/lib/storage/usage";

const META_CHAT_URL = "https://api.meta.ai/v1/chat/completions";
const META_SPEND_STOP_USD = 12;
const BEDROCK_SPEND_STOP_USD = 24;
const MAX_CONTEXT_CHARS = 24_000;

export type AiMessage = { role: "developer" | "user" | "assistant"; content: string };
export type AiUsage = { inputTokens: number; outputTokens: number; estimatedUsd: number };

export class AiServiceError extends Error {
  constructor(
    public readonly code: "invalid_request" | "not_configured" | "budget_reached" | "provider_unavailable" | "provider_auth" | "provider_timeout" | "invalid_response",
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "AiServiceError";
  }
}

export function metaConfigured() {
  return Boolean(getServerEnvironment().META_API_KEY);
}

function usesBedrock(operation: string) {
  return operation === "company-supervisor" || /^(task|coach|review|handoff)-software-engineer$/.test(operation);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function boundedMessages(messages: AiMessage[]) {
  let remaining = MAX_CONTEXT_CHARS;
  const result: AiMessage[] = [];
  for (const message of messages) {
    if (message.role === "developer") {
      const content = message.content.slice(0, 7000);
      remaining -= content.length;
      result.push({ role: message.role, content });
    }
  }
  for (const message of messages.filter((item) => item.role !== "developer").slice(-14).reverse()) {
    if (remaining <= 0) break;
    const content = message.content.slice(-Math.min(remaining, 6000));
    remaining -= content.length;
    result.push({ role: message.role, content });
  }
  return [...result.filter((item) => item.role === "developer"), ...result.filter((item) => item.role !== "developer").reverse()];
}

const providerResponseSchema = z.object({
  choices: z.array(z.object({
    finish_reason: z.string().nullable().optional(),
    message: z.object({ content: z.string().nullable() }),
  })).min(1),
  usage: z.object({ prompt_tokens: z.number().int().nonnegative().optional(), completion_tokens: z.number().int().nonnegative().optional() }).optional(),
});

export async function metaComplete<T>(args: {
  operation: string;
  messages: AiMessage[];
  schema?: z.ZodType<T>;
  schemaName?: string;
  maxTokens?: number;
  reasoningEffort?: "minimal" | "low";
}): Promise<{ value: T extends string ? string : T; usage: AiUsage }> {
  const env = getServerEnvironment();
  if (!env.META_API_KEY) throw new AiServiceError("not_configured", "Meta API access is not configured.", 503);
  if (await getEstimatedAiSpend("meta") >= META_SPEND_STOP_USD) {
    throw new AiServiceError("budget_reached", "The app's $12 estimated Meta testing budget has been reached.", 429);
  }
  const requestBody = {
    model: env.META_TEXT_MODEL,
    messages: boundedMessages(args.messages),
    reasoning_effort: args.reasoningEffort ?? "low",
    max_completion_tokens: Math.min(args.maxTokens ?? env.AI_MAX_OUTPUT_TOKENS, env.AI_MAX_OUTPUT_TOKENS),
    ...(args.schema ? { response_format: {
      type: "json_schema",
      json_schema: {
        name: args.schemaName ?? "structured_answer",
        schema: z.toJSONSchema(args.schema),
      },
    } } : {}),
  };

  let response: Response | undefined;
  let lastTransportWasTimeout = false;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      response = await fetch(META_CHAT_URL, {
        method: "POST",
        headers: { authorization: `Bearer ${env.META_API_KEY}`, "content-type": "application/json" },
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(env.AI_REQUEST_TIMEOUT_MS),
        cache: "no-store",
      });
    } catch (error) {
      lastTransportWasTimeout = error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");
      if (attempt === 0) { await sleep(350); continue; }
      throw lastTransportWasTimeout
        ? new AiServiceError("provider_timeout", "The AI request timed out. Try again.", 504)
        : new AiServiceError("provider_unavailable", "Could not connect to Meta. Try again shortly.", 503);
    }
    if (response.ok) break;
    if (response.status === 401 || response.status === 403) {
      throw new AiServiceError("provider_auth", "Meta rejected the configured API access. Check the local account setup.", 503);
    }
    if ((response.status === 429 || response.status >= 500) && attempt === 0) {
      await sleep(350);
      continue;
    }
    throw new AiServiceError("provider_unavailable", "Meta is unavailable for this request. Try again shortly.", 503);
  }
  if (!response?.ok) throw new AiServiceError("provider_unavailable", "Meta is unavailable for this request.", 503);

  let parsed: z.infer<typeof providerResponseSchema>;
  try {
    parsed = providerResponseSchema.parse(await response.json());
  } catch {
    throw new AiServiceError("invalid_response", "Meta returned an unreadable response.", 502);
  }
  const inputTokens = parsed.usage?.prompt_tokens ?? 0;
  const outputTokens = parsed.usage?.completion_tokens ?? 0;
  const estimatedUsd = (inputTokens * 1.25 + outputTokens * 4.25) / 1_000_000;
  await recordAiUsage({ provider: "meta", model: env.META_TEXT_MODEL, operation: args.operation, inputTokens, outputTokens, estimatedUsd });
  if (parsed.choices[0].finish_reason === "length") {
    throw new AiServiceError("invalid_response", "The AI response exceeded its output limit. Try a shorter request.", 502);
  }
  const content = parsed.choices[0].message.content;
  if (!content) throw new AiServiceError("invalid_response", "Meta returned no answer.", 502);
  let value: T | string;
  try {
    value = args.schema ? args.schema.parse(JSON.parse(content)) : content;
  } catch {
    throw new AiServiceError("invalid_response", "Meta returned an answer with an invalid structure. Try again.", 502);
  }
  return { value: value as T extends string ? string : T, usage: { inputTokens, outputTokens, estimatedUsd } };
}

type CompletionArgs<T> = Parameters<typeof metaComplete<T>>[0];
type Completion<T> = Awaited<ReturnType<typeof metaComplete<T>>>;

const bedrockResponseSchema = z.object({
  output: z.object({ message: z.object({ content: z.array(z.object({ text: z.string().optional() })) }) }),
  stopReason: z.string().optional(),
  usage: z.object({ inputTokens: z.number().int().nonnegative(), outputTokens: z.number().int().nonnegative() }),
});

export async function bedrockComplete<T>(args: CompletionArgs<T>): Promise<Completion<T>> {
  const env = getServerEnvironment();
  if (!env.AWS_BEARER_TOKEN_BEDROCK) throw new AiServiceError("not_configured", "Bedrock access is not configured.", 503);
  if (await getEstimatedAiSpend("bedrock") >= BEDROCK_SPEND_STOP_USD) {
    throw new AiServiceError("budget_reached", "The app's $24 estimated Bedrock testing budget has been reached.", 429);
  }
  const bounded = boundedMessages(args.messages);
  const developerText = bounded.filter((message) => message.role === "developer").map((message) => message.content).join("\n\n");
  const conversation = bounded.filter((message) => message.role !== "developer");
  const bedrockMessages: { role: "user" | "assistant"; content: { text: string }[] }[] = [];
  for (const message of conversation) {
    const role = message.role as "user" | "assistant";
    const previous = bedrockMessages.at(-1);
    if (previous?.role === role) previous.content.push({ text: message.content });
    else bedrockMessages.push({ role, content: [{ text: message.content }] });
  }
  const requestBody = {
    system: [{ text: developerText || "Answer the user's request." }],
    messages: bedrockMessages,
    inferenceConfig: { maxTokens: Math.min(args.maxTokens ?? env.AI_MAX_OUTPUT_TOKENS, env.AI_MAX_OUTPUT_TOKENS), temperature: 0.3 },
    ...(args.schema ? { outputConfig: { textFormat: { type: "json_schema", structure: { jsonSchema: {
      name: args.schemaName ?? "structured_answer", schema: JSON.stringify(z.toJSONSchema(args.schema)),
    } } } } } : {}),
  };
  const url = `https://bedrock-runtime.${env.BEDROCK_REGION}.amazonaws.com/model/${encodeURIComponent(env.BEDROCK_MODEL_ID)}/converse`;
  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST", headers: { authorization: `Bearer ${env.AWS_BEARER_TOKEN_BEDROCK}`, "content-type": "application/json" },
      body: JSON.stringify(requestBody), signal: AbortSignal.timeout(Math.max(env.AI_REQUEST_TIMEOUT_MS, 60000)), cache: "no-store",
    });
  } catch (error) {
    const timeout = error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");
    throw new AiServiceError(timeout ? "provider_timeout" : "provider_unavailable", timeout ? "Bedrock timed out." : "Could not connect to Bedrock.", timeout ? 504 : 503);
  }
  if (response.status === 401 || response.status === 403) throw new AiServiceError("provider_auth", "Bedrock rejected the configured access.", 503);
  if (!response.ok) throw new AiServiceError("provider_unavailable", "Bedrock could not complete this request.", 503);
  const parsed = bedrockResponseSchema.safeParse(await response.json().catch(() => null));
  if (!parsed.success) throw new AiServiceError("invalid_response", "Bedrock returned an unreadable response.", 502);
  const { inputTokens, outputTokens } = parsed.data.usage;
  const rate = env.BEDROCK_MODEL_ID.includes("sonnet-4-6") ? [3, 15] : [6, 30];
  const estimatedUsd = (inputTokens * rate[0] + outputTokens * rate[1]) / 1_000_000;
  await recordAiUsage({ provider: "bedrock", model: env.BEDROCK_MODEL_ID, operation: args.operation, inputTokens, outputTokens, estimatedUsd });
  if (parsed.data.stopReason && !["end_turn", "stop_sequence"].includes(parsed.data.stopReason)) {
    throw new AiServiceError("invalid_response", "Bedrock did not complete the answer.", 502);
  }
  const content = parsed.data.output.message.content.map((block) => block.text ?? "").join("").trim();
  if (!content) throw new AiServiceError("invalid_response", "Bedrock returned no answer.", 502);
  try {
    const value = args.schema ? args.schema.parse(JSON.parse(content)) : content;
    return { value: value as Completion<T>["value"], usage: { inputTokens, outputTokens, estimatedUsd } };
  } catch {
    throw new AiServiceError("invalid_response", "Bedrock returned an answer with an invalid structure.", 502);
  }
}

export async function completeWithFallback<T>(args: CompletionArgs<T>): Promise<(Completion<T> & { provider: "bedrock" | "meta" }) | null> {
  const env = getServerEnvironment();
  if (usesBedrock(args.operation) && env.AWS_BEARER_TOKEN_BEDROCK) {
    try { return { ...await bedrockComplete(args), provider: "bedrock" }; }
    catch (error) {
      if (!(error instanceof AiServiceError)) throw error;
      console.warn("AI provider fallback", { operation: args.operation, provider: "bedrock", code: error.code });
    }
  }
  if (env.META_API_KEY) {
    try { return { ...await metaComplete(args), provider: "meta" }; }
    catch (error) {
      if (!(error instanceof AiServiceError)) throw error;
      console.warn("AI provider fallback", { operation: args.operation, provider: "meta", code: error.code });
    }
  }
  return null;
}

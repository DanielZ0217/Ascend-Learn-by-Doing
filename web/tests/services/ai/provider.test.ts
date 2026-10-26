import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/config", () => ({
  getServerEnvironment: vi.fn(),
}));
vi.mock("@/lib/storage/usage", () => ({
  getEstimatedAiSpend: vi.fn(), recordAiUsage: vi.fn(),
}));

import { getServerEnvironment } from "../../../src/lib/config";
import { getEstimatedAiSpend, recordAiUsage } from "../../../src/lib/storage/usage";
import { completeWithFallback, metaComplete } from "../../../src/lib/ai/provider";

const mockedEnvironment = vi.mocked(getServerEnvironment);
const mockedSpend = vi.mocked(getEstimatedAiSpend);
const mockedRecord = vi.mocked(recordAiUsage);

beforeEach(() => {
  vi.resetAllMocks();
  mockedEnvironment.mockReturnValue({
    META_API_KEY: "test-key", META_TEXT_MODEL: "muse-spark-1.3", META_TRANSCRIBE_MODEL: "muse-voice-transcribe-1.0",
    AWS_BEARER_TOKEN_BEDROCK: undefined, BEDROCK_REGION: "us-east-1", BEDROCK_MODEL_ID: "us.anthropic.claude-sonnet-4-6",
    AI_MAX_OUTPUT_TOKENS: 3000, AI_REQUEST_TIMEOUT_MS: 3000,
    SEARCH_MAX_QUERIES_PER_TASK: 2, SEARCH_CACHE_TTL_SECONDS: 86400,
  });
  mockedSpend.mockResolvedValue(0);
  mockedRecord.mockResolvedValue(0);
});

describe("Meta adapter", () => {
  it("stops before a paid request when the app's estimated testing budget is reached", async () => {
    mockedSpend.mockResolvedValue(12);
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    await expect(metaComplete({ operation: "test", messages: [{ role: "user", content: "hello" }] })).rejects.toMatchObject({ code: "budget_reached", status: 429 });
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("validates structured output and records actual reported token usage", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({
      choices: [{ finish_reason: "stop", message: { content: JSON.stringify({ reply: "Clear next step" }) } }],
      usage: { prompt_tokens: 1000, completion_tokens: 200 },
    }), { status: 200 }));
    const result = await metaComplete({
      operation: "coach-test", messages: [{ role: "developer", content: "Be concise" }, { role: "user", content: "Help me" }],
      schema: z.object({ reply: z.string() }), schemaName: "reply", maxTokens: 500,
    });
    expect(result.value).toEqual({ reply: "Clear next step" });
    expect(result.usage).toEqual({ inputTokens: 1000, outputTokens: 200, estimatedUsd: 0.0021 });
    expect(mockedRecord).toHaveBeenCalledWith(expect.objectContaining({ operation: "coach-test", inputTokens: 1000, outputTokens: 200 }));
    const request = JSON.parse(fetchSpy.mock.calls[0][1]?.body as string);
    expect(request.max_completion_tokens).toBe(500);
    expect(request.reasoning_effort).toBe("low");
    expect(request.response_format.type).toBe("json_schema");
    fetchSpy.mockRestore();
  });

  it("returns a safe authentication error without exposing the provider response", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("account detail and key", { status: 401 }));
    await expect(metaComplete({ operation: "test", messages: [{ role: "user", content: "hello" }] })).rejects.toMatchObject({ code: "provider_auth", status: 503 });
    expect(mockedRecord).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("retries one timed-out transport call and then returns a retryable timeout", async () => {
    const timedOut = new Error("network internals");
    timedOut.name = "TimeoutError";
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockRejectedValue(timedOut);
    await expect(metaComplete({ operation: "test", messages: [{ role: "user", content: "hello" }] })).rejects.toMatchObject({ code: "provider_timeout", status: 504 });
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(mockedRecord).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("routes engineering to Bedrock and records its provider-specific usage", async () => {
    mockedEnvironment.mockReturnValue({ ...mockedEnvironment(), AWS_BEARER_TOKEN_BEDROCK: "test-bedrock-key" });
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({
      output: { message: { content: [{ text: JSON.stringify({ customerImpact: "A reliable queue helps the team." }) }] } },
      stopReason: "end_turn", usage: { inputTokens: 1000, outputTokens: 200 },
    }), { status: 200 }));
    const result = await completeWithFallback({ operation: "task-software-engineer", messages: [{ role: "developer", content: "Be specific" }, { role: "user", content: "Explain impact" }], schema: z.object({ customerImpact: z.string() }), schemaName: "code_assignment_context" });
    expect(result?.provider).toBe("bedrock");
    expect(result?.value).toEqual({ customerImpact: "A reliable queue helps the team." });
    expect(fetchSpy.mock.calls[0][0]).toContain("bedrock-runtime.us-east-1.amazonaws.com");
    expect((JSON.parse(fetchSpy.mock.calls[0][1]?.body as string) as { outputConfig: { textFormat: { type: string } } }).outputConfig.textFormat.type).toBe("json_schema");
    expect(mockedRecord).toHaveBeenCalledWith(expect.objectContaining({ provider: "bedrock", inputTokens: 1000, outputTokens: 200, estimatedUsd: 0.006 }));
    fetchSpy.mockRestore();
  });

  it("falls back from Bedrock to Meta, then returns null for a labeled fixture", async () => {
    mockedEnvironment.mockReturnValue({ ...mockedEnvironment(), AWS_BEARER_TOKEN_BEDROCK: "test-bedrock-key" });
    const fetchSpy = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response("denied", { status: 403 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ choices: [{ finish_reason: "stop", message: { content: "Meta answer" } }] }), { status: 200 }));
    const first = await completeWithFallback<string>({ operation: "coach-software-engineer", messages: [{ role: "user", content: "Help" }] });
    expect(first?.provider).toBe("meta");
    expect(first?.value).toBe("Meta answer");
    fetchSpy.mockReset().mockResolvedValue(new Response("denied", { status: 403 }));
    const second = await completeWithFallback<string>({ operation: "coach-software-engineer", messages: [{ role: "user", content: "Help" }] });
    expect(second).toBeNull();
    fetchSpy.mockRestore();
  });

  it("does not route other coworkers through Bedrock", async () => {
    mockedEnvironment.mockReturnValue({ ...mockedEnvironment(), AWS_BEARER_TOKEN_BEDROCK: "test-bedrock-key", META_API_KEY: undefined });
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    expect(await completeWithFallback<string>({ operation: "coach-sales-marketing", messages: [{ role: "user", content: "Pitch" }] })).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});

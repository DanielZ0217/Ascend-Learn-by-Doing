import { z } from "zod";

export const environmentSchema = z.object({
  META_API_KEY: z.string().trim().optional(),
  META_TEXT_MODEL: z.string().min(1).default("muse-spark-1.3"),
  META_TRANSCRIBE_MODEL: z.string().min(1).default("muse-voice-transcribe-1.0"),
  AWS_BEARER_TOKEN_BEDROCK: z.string().trim().optional(),
  BEDROCK_REGION: z.string().regex(/^[a-z]{2}-[a-z]+-\d$/).default("us-east-1"),
  BEDROCK_MODEL_ID: z.string().regex(/^[A-Za-z0-9._:-]+$/).default("us.anthropic.claude-sonnet-4-6"),
  SERPAPI_API_KEY: z.string().trim().optional(),
  AI_MAX_OUTPUT_TOKENS: z.coerce.number().int().min(256).max(8000).default(3000),
  AI_REQUEST_TIMEOUT_MS: z.coerce.number().int().min(1000).max(60000).default(30000),
  SEARCH_MAX_QUERIES_PER_TASK: z.coerce.number().int().min(1).max(3).default(2),
  SEARCH_CACHE_TTL_SECONDS: z.coerce.number().int().min(60).max(604800).default(86400),
});
export type ServerEnvironment = z.infer<typeof environmentSchema>;

// Explicit allowlist: raw environment values and credentials must never be serialized.
export function publicProviderStatus(config: ServerEnvironment) {
  return {
    text: { provider: "Bedrock Sonnet with Meta fallback", model: config.BEDROCK_MODEL_ID, configured: Boolean(config.AWS_BEARER_TOKEN_BEDROCK || config.META_API_KEY), bedrockConfigured: Boolean(config.AWS_BEARER_TOKEN_BEDROCK), metaConfigured: Boolean(config.META_API_KEY) },
    transcription: { provider: "Meta", model: config.META_TRANSCRIBE_MODEL, configured: Boolean(config.META_API_KEY) },
    research: { provider: "SerpApi", configured: Boolean(config.SERPAPI_API_KEY) },
    speechOutput: { provider: "Browser speech synthesis", requiresDeviceCheck: true },
    verification: "configuration-only",
  };
}

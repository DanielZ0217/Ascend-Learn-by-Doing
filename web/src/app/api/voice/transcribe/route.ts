import { z } from "zod";
import { getServerEnvironment } from "@/lib/config";
import { AiServiceError } from "@/lib/ai/provider";
import { apiError } from "@/lib/ai/http";
import { inspectPcmWav } from "@/lib/voice/wav";
import { getEstimatedAiSpend, recordAiUsage } from "@/lib/storage/usage";

const META_TRANSCRIBE_URL = "https://api.meta.ai/v1/asr/transcribe";
const responseSchema = z.object({ transcript: z.string().max(10000), audioDurationMs: z.number().int().min(0).max(600000) });

export async function POST(request: Request) {
  try {
    if (!request.headers.get("content-type")?.startsWith("multipart/form-data")) {
      throw new AiServiceError("invalid_request", "Send a WAV recording as multipart form data.", 400);
    }
    if (Number(request.headers.get("content-length") ?? 0) > 2_600_000) {
      throw new AiServiceError("invalid_request", "Record a clip under 45 seconds and try again.", 413);
    }
    const env = getServerEnvironment();
    if (!env.META_API_KEY) throw new AiServiceError("not_configured", "Voice transcription needs a Meta API key. You can keep practicing by typing.", 503);
    if (await getEstimatedAiSpend("meta") >= 12) throw new AiServiceError("budget_reached", "The app's $12 estimated Meta testing budget has been reached. You can keep practicing by typing.", 429);
    let form: FormData;
    try { form = await request.formData(); }
    catch { throw new AiServiceError("invalid_request", "The recording upload was incomplete. Please try again.", 400); }
    const file = form.get("audio");
    if (!(file instanceof File) || file.size > 2_500_000) throw new AiServiceError("invalid_request", "Record a clip under 45 seconds and try again.", 400);
    try { inspectPcmWav(await file.arrayBuffer()); }
    catch (error) { throw new AiServiceError("invalid_request", error instanceof Error ? error.message : "This recording could not be read.", 400); }

    const upstream = new FormData();
    upstream.set("request", new Blob([JSON.stringify({ model: env.META_TRANSCRIBE_MODEL, audioEncoding: "WAV", mode: "PUSH_TO_TALK" })], { type: "application/json" }));
    upstream.set("audio", file, "recording.wav");
    let response: Response;
    try {
      response = await fetch(META_TRANSCRIBE_URL, {
        method: "POST",
        headers: { authorization: `Bearer ${env.META_API_KEY}`, accept: "application/json" },
        body: upstream,
        signal: AbortSignal.timeout(env.AI_REQUEST_TIMEOUT_MS),
        cache: "no-store",
      });
    } catch (error) {
      const timedOut = error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");
      throw timedOut
        ? new AiServiceError("provider_timeout", "Voice transcription timed out. Retry this clip or switch to text.", 504)
        : new AiServiceError("provider_unavailable", "Voice transcription could not connect. Retry or switch to text.", 503);
    }
    if (response.status === 401 || response.status === 403) throw new AiServiceError("provider_auth", "Meta rejected voice access. Check the local setup or use text.", 503);
    if (!response.ok) throw new AiServiceError("provider_unavailable", response.status === 400 ? "Meta could not read that recording. Try speaking again." : "Voice transcription is unavailable. Retry or switch to text.", 503);
    let upstreamBody: unknown;
    try { upstreamBody = await response.json(); }
    catch { throw new AiServiceError("invalid_response", "Meta returned an unreadable transcript. Try again.", 502); }
    const parsed = responseSchema.safeParse(upstreamBody);
    if (!parsed.success) throw new AiServiceError("invalid_response", "Meta returned an unreadable transcript. Try again.", 502);
    const durationMs = parsed.data.audioDurationMs;
    await recordAiUsage({ provider: "meta", model: env.META_TRANSCRIBE_MODEL, operation: "voice-transcription", inputTokens: 0, outputTokens: 0, estimatedUsd: durationMs / 3_600_000 * .18 });
    const transcript = parsed.data.transcript.trim();
    if (!transcript) throw new AiServiceError("invalid_response", "No speech was detected. Try again or type your reply.", 422);
    return Response.json({ transcript, durationMs, mode: "live" as const });
  } catch (error) { return apiError(error); }
}

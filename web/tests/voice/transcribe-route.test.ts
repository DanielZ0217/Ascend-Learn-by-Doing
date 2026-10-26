import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/config", () => ({ getServerEnvironment: vi.fn() }));
vi.mock("@/lib/storage/usage", () => ({ getEstimatedAiSpend: vi.fn(), recordAiUsage: vi.fn() }));

import { getServerEnvironment } from "@/lib/config";
import { getEstimatedAiSpend, recordAiUsage } from "@/lib/storage/usage";
import { POST } from "@/app/api/voice/transcribe/route";

function wavFile() {
  const data = new ArrayBuffer(44 + 48_000);
  const view = new DataView(data);
  const label = (at: number, text: string) => { for (let i = 0; i < text.length; i++) view.setUint8(at + i, text.charCodeAt(i)); };
  label(0, "RIFF"); view.setUint32(4, data.byteLength - 8, true); label(8, "WAVE");
  label(12, "fmt "); view.setUint32(16, 16, true); view.setUint16(20, 1, true);
  view.setUint16(22, 1, true); view.setUint32(24, 24_000, true); view.setUint32(28, 48_000, true);
  view.setUint16(32, 2, true); view.setUint16(34, 16, true); label(36, "data"); view.setUint32(40, 48_000, true);
  return new File([data], "speech.wav", { type: "audio/wav" });
}

function request(file: File) {
  const form = new FormData();
  form.set("audio", file);
  return new Request("http://localhost/api/voice/transcribe", { method: "POST", body: form });
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(getServerEnvironment).mockReturnValue({ META_API_KEY: "test-secret", META_TRANSCRIBE_MODEL: "muse-voice-transcribe-1.0", AI_REQUEST_TIMEOUT_MS: 30000 } as ReturnType<typeof getServerEnvironment>);
  vi.mocked(getEstimatedAiSpend).mockResolvedValue(0);
  vi.mocked(recordAiUsage).mockResolvedValue(0.001);
});

describe("voice transcription route", () => {
  it("rejects malformed audio before contacting Meta", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({}));
    const response = await POST(request(new File(["not wav"], "bad.wav", { type: "audio/wav" })));
    expect(response.status).toBe(400);
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("sends the documented WAV multipart shape and records only usage metadata", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ transcript: "I can help with that.", audioDurationMs: 1000, turns: [] }));
    const response = await POST(request(wavFile()));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ transcript: "I can help with that.", durationMs: 1000, mode: "live" });
    const [url, options] = fetchSpy.mock.calls[0];
    expect(url).toBe("https://api.meta.ai/v1/asr/transcribe");
    const body = options?.body as FormData;
    expect(JSON.parse(await (body.get("request") as Blob).text())).toEqual({ model: "muse-voice-transcribe-1.0", audioEncoding: "WAV", mode: "PUSH_TO_TALK" });
    expect((body.get("audio") as File).type).toBe("audio/wav");
    expect(vi.mocked(recordAiUsage)).toHaveBeenCalledWith(expect.objectContaining({ operation: "voice-transcription", inputTokens: 0, outputTokens: 0 }));
    fetchSpy.mockRestore();
  });
});

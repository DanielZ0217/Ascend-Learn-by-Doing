import { describe, expect, it } from "vitest";
import { inspectPcmWav } from "@/lib/voice/wav";

function wav(seconds = 1, sampleRate = 24000, channels = 1) {
  const dataBytes = seconds * sampleRate * channels * 2;
  const buffer = new ArrayBuffer(44 + dataBytes);
  const view = new DataView(buffer);
  const label = (offset: number, text: string) => { for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i)); };
  label(0, "RIFF"); view.setUint32(4, buffer.byteLength - 8, true); label(8, "WAVE");
  label(12, "fmt "); view.setUint32(16, 16, true); view.setUint16(20, 1, true);
  view.setUint16(22, channels, true); view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * channels * 2, true); view.setUint16(32, channels * 2, true);
  view.setUint16(34, 16, true); label(36, "data"); view.setUint32(40, dataBytes, true);
  return buffer;
}

describe("Meta voice upload boundary", () => {
  it("accepts a bounded mono PCM recording at Meta's native rate", () => {
    expect(inspectPcmWav(wav())).toEqual({ durationMs: 1000, sampleRate: 24000 });
  });
  it("rejects stereo and unsupported sample rates before the provider call", () => {
    expect(() => inspectPcmWav(wav(1, 24000, 2))).toThrow(/unsupported/i);
    expect(() => inspectPcmWav(wav(1, 48000, 1))).toThrow(/unsupported/i);
  });
  it("rejects empty and oversized clips", () => {
    expect(() => inspectPcmWav(wav(.1))).toThrow(/quarter second/i);
    expect(() => inspectPcmWav(wav(50))).toThrow(/45 seconds/i);
  });
});

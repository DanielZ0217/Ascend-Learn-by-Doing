/** Checks the exact PCM WAV shape accepted by Meta's file transcription endpoint. */
export function inspectPcmWav(buffer: ArrayBuffer): { durationMs: number; sampleRate: 16000 | 24000 } {
  if (buffer.byteLength < 46 || buffer.byteLength > 2_500_000) throw new Error("Record a clip under 45 seconds and try again.");
  const bytes = new Uint8Array(buffer);
  const view = new DataView(buffer);
  const label = (offset: number) => String.fromCharCode(...bytes.subarray(offset, offset + 4));
  if (label(0) !== "RIFF" || label(8) !== "WAVE") throw new Error("The recording could not be read as WAV audio.");
  let format: { codec: number; channels: number; sampleRate: number; bits: number } | null = null;
  let dataBytes = 0;
  for (let offset = 12; offset + 8 <= bytes.length;) {
    const size = view.getUint32(offset + 4, true);
    const start = offset + 8;
    if (start + size > bytes.length) throw new Error("The recording is incomplete. Please record again.");
    if (label(offset) === "fmt " && size >= 16) format = {
      codec: view.getUint16(start, true), channels: view.getUint16(start + 2, true),
      sampleRate: view.getUint32(start + 4, true), bits: view.getUint16(start + 14, true),
    };
    if (label(offset) === "data") dataBytes = size;
    offset = start + size + (size % 2);
  }
  if (!format || format.codec !== 1 || format.channels !== 1 || format.bits !== 16 || (format.sampleRate !== 16000 && format.sampleRate !== 24000) || dataBytes === 0) {
    throw new Error("The recording format is unsupported. Please record again.");
  }
  const durationMs = Math.round(dataBytes / (format.sampleRate * 2) * 1000);
  if (durationMs < 250 || durationMs > 45_000) throw new Error("Record between a quarter second and 45 seconds.");
  return { durationMs, sampleRate: format.sampleRate as 16000 | 24000 };
}

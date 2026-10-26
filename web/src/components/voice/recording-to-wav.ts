/** Converts a short browser MediaRecorder clip to the PCM WAV required by Meta transcription. */
export async function recordingToWav(recording: Blob): Promise<Blob> {
  const audioContext = new AudioContext();
  try {
    const decoded = await audioContext.decodeAudioData(await recording.arrayBuffer());
    const length = Math.round(decoded.duration * 24_000);
    if (length < 6_000 || length > 45 * 24_000) throw new Error("Record between a quarter second and 45 seconds.");
    const samples = new Float32Array(length);
    const channelCount = decoded.numberOfChannels;
    const channels = Array.from({ length: channelCount }, (_, channel) => decoded.getChannelData(channel));
    const sourceRate = decoded.sampleRate;
    for (let sample = 0; sample < length; sample++) {
      const sourceIndex = sample * sourceRate / 24_000;
      const low = Math.min(Math.floor(sourceIndex), decoded.length - 1);
      const high = Math.min(low + 1, decoded.length - 1);
      const mix = sourceIndex - low;
      let value = 0;
      for (const data of channels) {
        value += data[low] * (1 - mix) + data[high] * mix;
      }
      samples[sample] = value / channelCount;
    }
    const output = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(output);
    const put = (offset: number, text: string) => { for (let index = 0; index < text.length; index++) view.setUint8(offset + index, text.charCodeAt(index)); };
    put(0, "RIFF"); view.setUint32(4, output.byteLength - 8, true); put(8, "WAVE");
    put(12, "fmt "); view.setUint32(16, 16, true); view.setUint16(20, 1, true);
    view.setUint16(22, 1, true); view.setUint32(24, 24_000, true); view.setUint32(28, 48_000, true);
    view.setUint16(32, 2, true); view.setUint16(34, 16, true); put(36, "data"); view.setUint32(40, samples.length * 2, true);
    for (let sample = 0; sample < samples.length; sample++) {
      const value = Math.max(-1, Math.min(1, samples[sample]));
      view.setInt16(44 + sample * 2, value < 0 ? Math.round(value * 32768) : Math.round(value * 32767), true);
    }
    return new Blob([output], { type: "audio/wav" });
  } finally {
    await audioContext.close();
  }
}

"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, RotateCcw, Square, Volume2, VolumeX } from "lucide-react";
import { recordingToWav } from "./recording-to-wav";

type CustomerVoiceControlsProps = {
  companyId: string;
  disabled: boolean;
  lastCustomerReply?: string;
  onTranscript: (text: string) => void;
};

type VoiceError = { error?: { message?: string } };

export function CustomerVoiceControls({ companyId, disabled, lastCustomerReply, onTranscript }: CustomerVoiceControlsProps) {
  const [mode, setMode] = useState<"text" | "voice">("text");
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState("");
  const [lastTranscript, setLastTranscript] = useState("");
  const [retryAvailable, setRetryAvailable] = useState(false);
  const [speakReplies, setSpeakReplies] = useState(true);
  const [speaking, setSpeaking] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState("");
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timeoutRef = useRef<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const retryWavRef = useRef<Blob | null>(null);
  const canceledRef = useRef(false);
  const lastSpokenRef = useRef(lastCustomerReply);
  const transcriptHandlerRef = useRef(onTranscript);

  useEffect(() => { transcriptHandlerRef.current = onTranscript; }, [onTranscript]);
  useEffect(() => {
    if (!("speechSynthesis" in window)) return;
    const update = () => setVoices(window.speechSynthesis.getVoices());
    const frame = requestAnimationFrame(update);
    window.speechSynthesis.addEventListener("voiceschanged", update);
    return () => { cancelAnimationFrame(frame); window.speechSynthesis.removeEventListener("voiceschanged", update); };
  }, []);
  useEffect(() => {
    if (!recording) return;
    const interval = window.setInterval(() => setElapsed((seconds) => seconds + 1), 1000);
    return () => window.clearInterval(interval);
  }, [recording]);
  useEffect(() => {
    if (mode !== "voice" || !speakReplies || !lastCustomerReply || lastSpokenRef.current === lastCustomerReply || !("speechSynthesis" in window)) return;
    lastSpokenRef.current = lastCustomerReply;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(lastCustomerReply);
    utterance.rate = .97;
    utterance.voice = voices.find((voice) => voice.voiceURI === selectedVoice) ?? voices.find((voice) => voice.lang.toLowerCase().startsWith("en")) ?? null;
    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => { setSpeaking(false); setError("Spoken playback is unavailable on this device. The customer reply is still shown in the transcript."); };
    window.speechSynthesis.speak(utterance);
  }, [lastCustomerReply, mode, speakReplies, selectedVoice, voices]);
  useEffect(() => () => {
    canceledRef.current = true;
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
    abortRef.current?.abort();
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  }, []);

  function stopCapture(cancel = false) {
    if (cancel) canceledRef.current = true;
    if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
    timeoutRef.current = null;
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
    streamRef.current?.getTracks().forEach((track) => track.stop());
  }

  function switchMode(next: "text" | "voice") {
    if (next === mode) return;
    if (next === "text") {
      stopCapture(true);
      abortRef.current?.abort();
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
      setRecording(false); setTranscribing(false); setSpeaking(false);
      retryWavRef.current = null; setRetryAvailable(false);
    } else lastSpokenRef.current = lastCustomerReply;
    setError("");
    setMode(next);
  }

  async function uploadWav(wav: Blob) {
    if (canceledRef.current) return;
    setTranscribing(true); setError("");
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const form = new FormData();
      form.set("audio", wav, "recording.wav");
      form.set("companyId", companyId);
      const response = await fetch("/api/voice/transcribe", { method: "POST", body: form, signal: controller.signal });
      const result: unknown = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error((result as VoiceError).error?.message || "Voice transcription failed. Retry or type your reply.");
      const transcript = typeof result === "object" && result !== null && "transcript" in result ? String(result.transcript).trim() : "";
      if (!transcript) throw new Error("No speech was detected. Please try again or type your reply.");
      if (transcript.length > 1000) throw new Error("That reply is too long. Please record a shorter answer or type your reply.");
      if (canceledRef.current) return;
      setLastTranscript(transcript);
      retryWavRef.current = null; setRetryAvailable(false);
      transcriptHandlerRef.current(transcript);
    } catch (cause) {
      if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Voice transcription failed. Retry or type your reply.");
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
      setTranscribing(false);
    }
  }

  async function finishRecording(chunks: Blob[], mimeType: string) {
    if (canceledRef.current) return;
    if (chunks.length === 0) { setError("No audio was captured. Try again or type your reply."); return; }
    setTranscribing(true);
    try {
      const wav = await recordingToWav(new Blob(chunks, { type: mimeType }));
      if (canceledRef.current) return;
      retryWavRef.current = wav; setRetryAvailable(true);
      await uploadWav(wav);
    } catch { setError("This browser could not prepare the recording. Try again or type your reply."); setTranscribing(false); }
  }

  async function startRecording() {
    if (disabled || transcribing || recording) return;
    setError(""); setLastTranscript(""); setElapsed(0); retryWavRef.current = null; setRetryAvailable(false); canceledRef.current = false;
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setError("Microphone recording is unavailable in this browser. You can type your reply below."); return;
    }
    let stream: MediaStream | null = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      if (canceledRef.current) { stream.getTracks().forEach((track) => track.stop()); return; }
      streamRef.current = stream;
      const mimeType = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"].find((type) => MediaRecorder.isTypeSupported(type));
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      recorderRef.current = recorder;
      chunksRef.current = [];
      recorder.ondataavailable = (event) => { if (event.data.size) chunksRef.current.push(event.data); };
      recorder.onerror = () => { stopCapture(true); setRecording(false); setError("The microphone stopped unexpectedly. Try again or type your reply."); };
      recorder.onstop = () => {
        stream?.getTracks().forEach((track) => track.stop());
        streamRef.current = null; recorderRef.current = null; setRecording(false);
        if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
        if (!canceledRef.current) void finishRecording(chunksRef.current, recorder.mimeType);
      };
      recorder.start(250);
      setRecording(true);
      timeoutRef.current = window.setTimeout(() => stopCapture(), 45_000);
    } catch (cause) {
      stream?.getTracks().forEach((track) => track.stop());
      const name = cause instanceof Error ? cause.name : "";
      setError(name === "NotAllowedError" || name === "PermissionDeniedError" ? "Microphone access was denied. Use the text reply below, or allow access and try again." : "Could not start the microphone. Use text or try again.");
    }
  }

  function stopSpeaking() {
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    setSpeaking(false);
  }

  return <section className="mt-4 rounded-2xl border border-[#dce8dc] bg-[#f7faf5] p-3" aria-label="Customer voice practice">
    <div className="flex flex-wrap items-center justify-between gap-2"><div className="flex items-center gap-2"><span className="grid size-8 place-items-center rounded-lg bg-[#e5f0e5] text-[#37674e]"><Mic size={16}/></span><div><strong className="block text-xs text-[#2b5240]">Practice your response</strong><span className="text-[10px] text-[#778878]">Voice is optional. The conversation stays visible.</span></div></div><div className="flex rounded-lg border border-[#d7e3d7] bg-white p-0.5" role="group" aria-label="Reply mode"><button type="button" aria-pressed={mode === "text"} onClick={() => switchMode("text")} className={`rounded-md px-3 py-1.5 text-[11px] font-semibold ${mode === "text" ? "bg-[#285841] text-white" : "text-[#667968]"}`}>Text</button><button type="button" aria-pressed={mode === "voice"} onClick={() => switchMode("voice")} className={`rounded-md px-3 py-1.5 text-[11px] font-semibold ${mode === "voice" ? "bg-[#285841] text-white" : "text-[#667968]"}`}>Voice</button></div></div>
    {mode === "voice" && <div className="mt-3 border-t border-[#dce8dc] pt-3"><div className="flex flex-wrap items-center gap-2">{recording ? <button type="button" onClick={() => stopCapture()} className="inline-flex items-center gap-2 rounded-lg bg-[#9f493d] px-3 py-2 text-xs font-bold text-white"><Square size={13} fill="currentColor"/> Stop recording <span>{elapsed}s</span></button> : <button type="button" disabled={disabled || transcribing} onClick={() => void startRecording()} className="inline-flex items-center gap-2 rounded-lg bg-[#285841] px-3 py-2 text-xs font-bold text-white disabled:opacity-50"><Mic size={15}/> Start recording</button>}{transcribing && <span role="status" className="text-[11px] text-[#678071]">Transcribing with Meta…</span>}{speaking && <button type="button" onClick={stopSpeaking} className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#496b57]"><VolumeX size={14}/> Stop playback</button>}</div><div className="mt-3 flex flex-wrap items-center gap-3"><label className="inline-flex items-center gap-1.5 text-[11px] text-[#587260]"><input type="checkbox" checked={speakReplies} onChange={(event) => { setSpeakReplies(event.target.checked); if (!event.target.checked) stopSpeaking(); }}/> <Volume2 size={13}/> Speak customer replies</label>{voices.length > 0 && speakReplies && <label className="text-[11px] text-[#6a806e]">Voice <select aria-label="Browser voice" className="ml-1 max-w-[180px] rounded border border-[#dce5da] bg-white px-1 py-1 text-[11px]" value={selectedVoice} onChange={(event) => setSelectedVoice(event.target.value)}><option value="">Default browser voice</option>{voices.filter((voice) => voice.lang.toLowerCase().startsWith("en")).map((voice) => <option key={voice.voiceURI} value={voice.voiceURI}>{voice.name}</option>)}</select></label>}</div><p className="mt-2 text-[10px] leading-5 text-[#839083]">Press Start to allow microphone access. Stop sends only this short clip for transcription. You can always type below.</p></div>}
    {lastTranscript && mode === "voice" && <p role="status" className="mt-2 rounded-lg bg-white px-3 py-2 text-[11px] text-[#375a43]"><strong>Heard:</strong> {lastTranscript}</p>}
    {error && <div role="alert" className="mt-2 rounded-lg bg-[#fff1eb] px-3 py-2 text-[11px] text-[#914b3b]"><p>{error}</p><div className="mt-1 flex gap-3">{mode === "voice" && retryAvailable && !transcribing && <button type="button" className="inline-flex items-center gap-1 font-bold underline" onClick={() => { if (retryWavRef.current) void uploadWav(retryWavRef.current); }}><RotateCcw size={12}/> Retry transcription</button>}<button type="button" className="inline-flex items-center gap-1 font-bold underline" onClick={() => switchMode("text")}><MicOff size={12}/> Use text</button></div></div>}
  </section>;
}

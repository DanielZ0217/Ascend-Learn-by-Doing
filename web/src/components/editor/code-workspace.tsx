"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { loader } from "@monaco-editor/react";
import { CheckCircle2, CircleX, Code2, LoaderCircle, Play, RotateCcw, ShieldCheck, TriangleAlert } from "lucide-react";
import type { Assignment, RunResult } from "@/lib/contracts";
import { runJavaScript } from "@/lib/runner";

const Editor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => <div className="grid h-[390px] place-items-center bg-[#172b23] text-xs text-[#9cb6a3]">Preparing the code editor…</div>,
});

type CodeAssignment = Extract<Assignment, { kind: "code" }>;

export function CodeWorkspace({ assignment, value, onChange, result, onResult }: {
  assignment: CodeAssignment;
  value: string;
  onChange: (value: string) => void;
  result: RunResult | null;
  onResult: (value: RunResult | null) => void;
}) {
  const [editorReady, setEditorReady] = useState(false);
  const [monacoMounted, setMonacoMounted] = useState(false);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    let active = true;
    (window as Window & { MonacoEnvironment?: { getWorker: (workerId: string, label: string) => Worker } }).MonacoEnvironment = {
      getWorker: (_workerId, label) => new Worker(
        label === "javascript" || label === "typescript" ? "/runner/monaco-ts.worker.js" : "/runner/monaco-editor.worker.js",
      ),
    };
    import("monaco-editor").then((monaco) => {
      if (!active) return;
      loader.config({ monaco });
      setEditorReady(true);
    }).catch(() => {
      if (active) setEditorReady(false);
    });
    return () => { active = false; };
  }, []);

  async function run() {
    if (running) return;
    setRunning(true);
    onResult(null);
    try { onResult(await runJavaScript(value, assignment)); }
    catch { onResult({ status: "unavailable", checks: [], output: "The code runner could not start.", durationMs: 0 }); }
    finally { setRunning(false); }
  }

  const passed = result?.checks.filter((check) => check.passed).length ?? 0;
  return <div className="mt-5">
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs"><span className="flex items-center gap-2 font-semibold text-[#526d58]"><Code2 size={15} /> {value === assignment.starterCode ? "Starter code · edit below" : "Your JavaScript solution"}</span><span className="flex items-center gap-1.5 rounded-lg bg-[#eff4ed] px-2.5 py-1.5 font-mono text-[10px] text-[#6b836e]"><ShieldCheck size={13} /> isolated browser checks</span></div>
    <div className="overflow-hidden rounded-2xl border border-[#253b30] bg-[#172b23]"><div className="flex items-center justify-between border-b border-white/10 px-4 py-2.5"><div className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-[#d98672]" /><span className="size-2 rounded-full bg-[#e8c477]" /><span className="size-2 rounded-full bg-[#81ae86]" /><span className="ml-3 font-mono text-[10px] text-[#a6bcab]">solution.js</span></div><span className="font-mono text-[10px] text-[#7d9884]">JavaScript</span></div>
      <div className="relative min-h-[390px]">
        {!monacoMounted && <textarea aria-label="JavaScript solution" spellCheck={false} value={value} onChange={(event) => { onChange(event.target.value.slice(0, 30000)); onResult(null); }} className="absolute inset-0 h-full w-full resize-none bg-transparent p-5 font-mono text-[13px] leading-6 text-[#e7f3e8] outline-none placeholder:text-[#789183]" placeholder="// Write your solution here" />}
        {editorReady && <div className={monacoMounted ? "" : "pointer-events-none absolute inset-0 opacity-0"}><Editor height="390px" language="javascript" theme="vs-dark" value={value} onMount={() => setMonacoMounted(true)} onChange={(next) => { onChange((next ?? "").slice(0, 30000)); onResult(null); }} options={{ minimap: { enabled: false }, fontSize: 13, lineHeight: 22, scrollBeyondLastLine: false, automaticLayout: true, tabSize: 2, padding: { top: 16, bottom: 16 }, wordWrap: "on", overviewRulerLanes: 0, contextmenu: false, suggestOnTriggerCharacters: false, quickSuggestions: false, autoClosingBrackets: "never", autoClosingQuotes: "never", autoIndent: "none", formatOnType: false }} /></div>}
      </div>
    </div>
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3"><p className="max-w-[340px] text-[11px] leading-5 text-[#859389]">Run the supplied checks locally before submitting. Code never runs on the app server.</p><button type="button" onClick={() => void run()} disabled={running} className="inline-flex items-center gap-2 rounded-xl border border-[#cbdccd] bg-[#eff7ee] px-4 py-2.5 text-xs font-bold text-[#356d47] hover:bg-[#e2f0e1] disabled:opacity-60">{running ? <LoaderCircle size={15} className="animate-spin" /> : <Play size={14} fill="currentColor" />}{running ? "Running checks…" : "Run checks"}</button></div>
    {result && <div role="status" className={`mt-4 overflow-hidden rounded-2xl border ${result.status === "completed" && passed === assignment.checks.length ? "border-[#c9e4cc] bg-[#f5fbf4]" : "border-[#e5d6bf] bg-[#fffbf4]"}`}><div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#e9eee5] px-4 py-3"><div className="flex items-center gap-2 text-xs font-bold text-[#3c6549]">{result.status === "completed" && passed === assignment.checks.length ? <CheckCircle2 size={17} className="text-[#58a06b]" /> : <TriangleAlert size={17} className="text-[#c08a54]" />}{result.status === "completed" ? `${passed} of ${assignment.checks.length} checks passed` : result.status === "timeout" ? "Code timed out" : result.status === "unavailable" ? "Checks unavailable" : "Code could not run"}</div><span className="font-mono text-[10px] text-[#95a394]">{Math.round(result.durationMs)} ms</span></div>{result.checks.length > 0 && <div className="divide-y divide-[#e9eee6]">{assignment.checks.map((check) => { const outcome = result.checks.find((item) => item.id === check.id); return <div key={check.id} className="flex gap-3 px-4 py-3"><span className="mt-0.5 shrink-0">{outcome?.passed ? <CheckCircle2 size={15} className="text-[#61a473]" /> : <CircleX size={15} className="text-[#c58061]" />}</span><div className="min-w-0"><div className="text-xs font-semibold text-[#4d6752]">{check.label}</div><div className="mt-1 break-words font-mono text-[10px] leading-5 text-[#7c897c]">{outcome?.detail ?? "Not run"}</div></div></div>; })}</div>}{result.output && <pre className="max-h-44 overflow-auto border-t border-[#e9eee6] px-4 py-3 font-mono text-[10px] leading-5 whitespace-pre-wrap text-[#6d776d]">{result.output}</pre>}<div className="flex items-center gap-1.5 px-4 py-2 text-[10px] text-[#829383]"><RotateCcw size={11} /> Edit and run again to check a revision.</div></div>}
  </div>;
}

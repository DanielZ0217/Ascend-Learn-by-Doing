import { runResultSchema, type Assignment, type RunResult } from "@/lib/contracts";

const CHANNEL = "workplace-code-runner-v1";
const TIMEOUT_MS = 2500;

function unavailable(output: string): RunResult {
  return { status: "unavailable", checks: [], output, durationMs: 0 };
}

export function runJavaScript(code: string, assignment: Extract<Assignment, { kind: "code" }>): Promise<RunResult> {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return Promise.resolve(unavailable("Code checks are available in the browser only."));
  }
  if (!code.trim()) return Promise.resolve({ status: "error", checks: [], output: "Write a solution before running checks.", durationMs: 0 });
  if (code.length > 30000) return Promise.resolve({ status: "error", checks: [], output: "The solution exceeds the 30,000 character limit.", durationMs: 0 });

  return new Promise((resolve) => {
    const runId = crypto.randomUUID();
    const frame = document.createElement("iframe");
    frame.setAttribute("sandbox", "allow-scripts");
    frame.setAttribute("aria-hidden", "true");
    frame.setAttribute("tabindex", "-1");
    frame.referrerPolicy = "no-referrer";
    frame.style.cssText = "position:fixed;width:0;height:0;border:0;opacity:0;pointer-events:none";
    frame.src = "/runner/sandbox.html";
    let finished = false;
    let timer = 0;
    const finish = (result: RunResult) => {
      if (finished) return;
      finished = true;
      window.clearTimeout(timer);
      window.removeEventListener("message", onMessage);
      frame.remove();
      resolve(result);
    };
    const onMessage = (event: MessageEvent) => {
      if (event.source !== frame.contentWindow || event.origin !== "null") return;
      const data = event.data;
      if (!data || data.channel !== CHANNEL || data.type !== "result" || data.runId !== runId) return;
      const result = runResultSchema.safeParse(data.result);
      if (!result.success) return finish(unavailable("The code runner returned an invalid result."));
      const expected = new Set(assignment.checks.map((check) => check.id));
      if (result.data.checks.some((check) => !expected.has(check.id)) || (result.data.status === "completed" && result.data.checks.length !== assignment.checks.length)) {
        return finish(unavailable("The code runner returned unexpected check data."));
      }
      finish(result.data);
    };
    window.addEventListener("message", onMessage);
    timer = window.setTimeout(() => finish({ status: "timeout", checks: [], output: "Code stopped after 2.5 seconds. Check for an endless loop or slow operation.", durationMs: TIMEOUT_MS }), TIMEOUT_MS);
    frame.onerror = () => finish(unavailable("Could not open the isolated code runner."));
    frame.onload = () => frame.contentWindow?.postMessage({
      channel: CHANNEL, type: "run", runId, code, functionName: assignment.functionName,
      checks: assignment.checks,
    }, "*");
    document.body.appendChild(frame);
  });
}

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CodeWorkspace } from "@/components/editor/code-workspace";
import { CoachMessage } from "@/components/learning/coach-message";
import { Stage2Panel } from "@/components/stage2/stage2-panel";
import { AppNavigation } from "@/components/company/app-navigation";
import { DetailSheet } from "@/components/ui/detail-sheet";
import { CustomerVoiceControls } from "@/components/voice/customer-voice-controls";
import {
  ArrowLeft, ArrowRight, BookOpen, BrainCircuit, BriefcaseBusiness, Check, CheckCircle2,
  ChevronDown, CircleHelp, ClipboardCheck, Code2, Database, FileText, Headphones,
  Lightbulb, LoaderCircle, Maximize2, Megaphone, Paperclip, Plus, RefreshCw,
  Send, Target, Upload, UserRound, X,
} from "lucide-react";
import {
  assignmentSchema, conversationTurnSchema, learningGoalSchema, reviewSchema, roleIds,
  roleLabels, sourceExcerptSchema, submissionSchema,
  type Assignment, type CompanyBlueprint, type ConversationTurn,
  type LearningSession, type Review, type RoleId, type RunResult, type SourceExcerpt,
} from "@/lib/contracts";
import {
  appendAssignment, appendSubmission, appendTurn, assignmentForRole, companyKey,
  emptyPreferences, nextAttempt, readBlueprint, readPreferences, readSession,
  resetSession, savePreferences, saveSession, turnsForChannel, type RolePreferences, type WorkspacePreferences,
} from "@/lib/session/store";

const roleIcons = {
  "software-engineer": Code2,
  "sales-marketing": Megaphone,
  "customer-support": Headphones,
  "product-manager": BriefcaseBusiness,
  "data-analyst": Database,
} as const;

const roleStyles: Record<RoleId, { color: string; tint: string; eyebrow: string; action: string }> = {
  "software-engineer": { color: "#4f79d9", tint: "#e9efff", eyebrow: "BUILD & SHIP", action: "Solve a real product problem" },
  "sales-marketing": { color: "#c17a4a", tint: "#fff0e2", eyebrow: "GROW & CONNECT", action: "Win over a real customer" },
  "customer-support": { color: "#368a8a", tint: "#e3f4f1", eyebrow: "LISTEN & RESOLVE", action: "Turn a problem into trust" },
  "product-manager": { color: "#a277b6", tint: "#f5ebfa", eyebrow: "DISCOVER & DECIDE", action: "Choose what matters most" },
  "data-analyst": { color: "#7f9150", tint: "#eef4df", eyebrow: "EXPLORE & EXPLAIN", action: "Find the story in the data" },
};

const fallbackTopics: Record<RoleId, string[]> = {
  "software-engineer": ["Prevent duplicate payments", "Handle a traffic spike", "Build a reliable lookup"],
  "sales-marketing": ["Pitch a new product", "Handle a customer objection", "Plan a launch campaign"],
  "customer-support": ["Resolve a billing complaint", "Explain a service outage", "Respond with empathy"],
  "product-manager": ["Prioritize customer requests", "Write a feature brief", "Define success metrics"],
  "data-analyst": ["Investigate a drop in signups", "Compare customer segments", "Explain a small dataset"],
};

type ApiMode = "live" | "fixture" | null;
type ApiError = { error?: string | { message?: string }; message?: string; code?: string };

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data: unknown = await response.json().catch(() => ({}));
  if (!response.ok) {
    const payload = data as ApiError;
    const detail = typeof payload.error === "string" ? payload.error : payload.error?.message || payload.message;
    throw new Error(detail || `Request failed (${response.status}). Please try again.`);
  }
  return data as T;
}

function createTurn(assignmentId: string, channel: "mentor" | "customer", text: string, origin: "text" | "voice" = "text"): ConversationTurn {
  return { id: `${channel}-student-${crypto.randomUUID()}`, assignmentId, speaker: "student", text, timestamp: new Date().toISOString(), origin };
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong. Please try again.";
}

function SourceCard({ source, onOpen }: { source: SourceExcerpt; onOpen: () => void }) {
  return (
    <div className="rounded-2xl border border-[#e6e6dc] bg-white/75 px-4 py-3">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 rounded-lg bg-[#eff2e9] p-2 text-[#54705c]"><FileText size={15} /></div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            {source.url ? <a className="truncate text-sm font-semibold text-[#274a3d] underline decoration-[#bac7b8] underline-offset-2 hover:decoration-[#274a3d]" href={source.url} target="_blank" rel="noreferrer">{source.title}</a>
              : <span className="truncate text-sm font-semibold text-[#274a3d]">{source.title}</span>}
            <span className="rounded-full bg-[#f0f2eb] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#6b796b]">{source.provenance}</span>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-[#6e786f]">{source.location ? `${source.location} · ` : ""}{source.excerpt.slice(0, 190)}{source.excerpt.length > 190 ? "…" : ""}</p>
          <button type="button" onClick={onOpen} className="mt-2 text-xs font-semibold text-[#3b7551] underline underline-offset-2">View passage</button>
        </div>
      </div>
    </div>
  );
}

function LoadingSpinner() { return <LoaderCircle size={16} className="animate-spin" aria-hidden="true" />; }

export function LearningWorkspace({ companyId, roleId }: { companyId: string; roleId: RoleId }) {
  const router = useRouter();
  const [hydrated, setHydrated] = useState(false);
  const [blueprint, setBlueprint] = useState<CompanyBlueprint | null>(null);
  const [session, setSession] = useState<LearningSession | null>(null);
  const [preferences, setPreferences] = useState<WorkspacePreferences>(emptyPreferences);
  const [file, setFile] = useState<File | null>(null);
  const [materialOpen, setMaterialOpen] = useState(false);
  const [materialBusy, setMaterialBusy] = useState(false);
  const [customerMessage, setCustomerMessage] = useState("");
  const [mentorMessage, setMentorMessage] = useState("");
  const [learningStyle, setLearningStyle] = useState<string | null>(null);
  const [busy, setBusy] = useState<"assignment" | "mentor" | "customer" | "review" | null>(null);
  const [apiMode, setApiMode] = useState<ApiMode>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [planningNextTask, setPlanningNextTask] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(true);
  const [coachOpen, setCoachOpen] = useState(false);
  const [coachFull, setCoachFull] = useState(false);
  const [switchingProvider, setSwitchingProvider] = useState(false);
  const [codeRun, setCodeRun] = useState<{ assignmentId: string; code: string; result: RunResult } | null>(null);
  const [sourceDetail, setSourceDetail] = useState<SourceExcerpt | null>(null);
  const customerEnd = useRef<HTMLDivElement>(null);
  const mentorEnd = useRef<HTMLDivElement>(null);
  const coachPanel = useRef<HTMLElement>(null);
  const coachTrigger = useRef<HTMLButtonElement>(null);
  const coachClose = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      const company = readBlueprint(localStorage, companyId);
      setBlueprint(company);
      setApiMode(localStorage.getItem(`hacktx:company-mode:${companyId}`) === "live" ? "live" : "fixture");
      if (company) {
        const saved = readSession(localStorage, company);
        setSession({ ...saved, activeRole: roleId });
        setCoachFull(assignmentForRole(saved, roleId)?.goal.entryMode === "teach-first");
        setPreferences(readPreferences(localStorage, companyId));
      }
      setHydrated(true);
    });
    return () => { active = false; };
  }, [companyId, roleId]);

  useEffect(() => { if (hydrated && session) saveSession(localStorage, session); }, [hydrated, session]);
  useEffect(() => {
    if (!hydrated || blueprint?.company.participantMode !== "collaborative") return;
    void fetch("/api/stage2", { method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "role", companyId, roleId }) }).catch(() => {});
  }, [hydrated, blueprint?.company.participantMode, companyId, roleId]);
  useEffect(() => {
    const syncTask = () => {
      const company = readBlueprint(localStorage, companyId);
      if (company) setSession({ ...readSession(localStorage, company), activeRole: roleId });
    };
    window.addEventListener("hacktx:stage2-task", syncTask);
    return () => window.removeEventListener("hacktx:stage2-task", syncTask);
  }, [companyId, roleId]);
  useEffect(() => { if (hydrated && blueprint) savePreferences(localStorage, companyId, preferences); }, [hydrated, blueprint, companyId, preferences]);
  useEffect(() => {
    if (!hydrated || !blueprint) return;
    let active = true;
    void fetch(`/api/learner-preference?companyId=${encodeURIComponent(companyId)}`, { cache: "no-store" })
      .then((response) => response.ok ? response.json() as Promise<{ style: string | null }> : null)
      .then((result) => { if (active && result) setLearningStyle(result.style); });
    return () => { active = false; };
  }, [hydrated, blueprint, companyId]);
  useEffect(() => { customerEnd.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }); }, [session?.turns.length]);
  useEffect(() => { mentorEnd.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }); }, [session?.turns.length]);
  useEffect(() => { if (materialOpen) document.getElementById("material-panel")?.scrollIntoView({ behavior: "smooth", block: "center" }); }, [materialOpen]);

  const profile = blueprint?.profiles.find((item) => item.roleId === roleId);
  const assignment = session ? assignmentForRole(session, roleId) : undefined;
  const prefs = preferences.roles[roleId] ?? { topic: "", difficulty: "beginner", entryMode: "teach-first" };
  const allTurns = useMemo(() => assignment && session ? session.turns.filter((turn) => turn.assignmentId === assignment.id) : [], [assignment, session]);
  const customerTurns = turnsForChannel(allTurns, "customer");
  const mentorTurns = turnsForChannel(allTurns, "mentor");
  const attempts = assignment && session ? session.submissions.filter((item) => item.assignmentId === assignment.id) : [];
  const latestSubmission = attempts.at(-1);
  const latestReview = session?.reviews.find((item) => item.submissionId === latestSubmission?.id);
  const draft = assignment ? session?.drafts[assignment.id] ?? "" : "";
  const runResult = assignment?.kind === "code" && codeRun?.assignmentId === assignment.id && codeRun.code === draft ? codeRun.result : null;
  const lessonActive = assignment?.goal.entryMode === "teach-first";
  const codeFocus = assignment?.kind === "code" && !planningNextTask && !lessonActive;
  const coachModal = coachFull || (codeFocus && coachOpen);
  const roleStyle = roleStyles[roleId];
  const Icon = roleIcons[roleId];

  useEffect(() => {
    if (!coachModal) return;
    const panel = coachPanel.current;
    const returnSelector = coachFull && !codeFocus ? "#coach-expand" : ".coach-launcher";
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    coachClose.current?.focus();
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") { event.preventDefault(); setCoachFull(false); setCoachOpen(false); if (lessonActive) setPlanningNextTask(true); return; }
      if (event.key !== "Tab" || !panel) return;
      const focusable = [...panel.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], input:not([disabled]), textarea:not([disabled])')];
      if (!focusable.length) return;
      const first = focusable[0], last = focusable.at(-1)!;
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
      document.querySelector<HTMLElement>(returnSelector)?.focus();
    };
  }, [coachModal, coachFull, codeFocus, lessonActive]);

  function closeCoachPanel() {
    setCoachFull(false);
    setCoachOpen(false);
    if (lessonActive) setPlanningNextTask(true);
  }

  function updatePrefs(update: Partial<RolePreferences>) {
    setPreferences((current) => ({ ...current, roles: { ...current.roles, [roleId]: { ...prefs, ...update } } }));
  }

  function updateSession(update: (current: LearningSession) => LearningSession) {
    setSession((current) => current ? update(current) : current);
  }

  function setDraft(value: string) {
    if (!assignment) return;
    updateSession((current) => ({ ...current, drafts: { ...current.drafts, [assignment.id]: value } }));
  }

  function requestMode() {
    return localStorage.getItem(`hacktx:company-mode:${companyId}`) === "fixture" ? "fixture" as const : undefined;
  }

  async function enableLiveMeta() {
    if (switchingProvider) return;
    setError(null); setSwitchingProvider(true);
    try {
      await postJson<{ ok: true }>("/api/stage2", { action: "generation-mode", companyId, mode: "live" });
      localStorage.setItem(`hacktx:company-mode:${companyId}`, "live");
      setApiMode(null);
      setNotice("Meta is enabled for this company. Your current work is saved; ask your coach or start another task for a live response.");
    } catch (cause) { setError(`Could not enable Meta: ${getErrorMessage(cause)}`); }
    finally { setSwitchingProvider(false); }
  }

  async function startAssignment(entryMode: RolePreferences["entryMode"]) {
    if (!blueprint || !session) return;
    const lessonToContinue = assignment?.goal.entryMode === "teach-first" && entryMode === "task-first" ? assignment : undefined;
    const goalResult = learningGoalSchema.safeParse({ roleId, topic: lessonToContinue?.goal.topic ?? prefs.topic.trim(), difficulty: prefs.difficulty, entryMode });
    if (!goalResult.success) { setError("Choose a practice topic or describe what you want to learn first."); return; }
    setError(null); setNotice(null); setBusy("assignment"); updatePrefs({ entryMode });
    try {
      const result = await postJson<{ assignment: Assignment; mode?: ApiMode; retrieval?: "milvus" | "fts" | "none"; research?: "live" | "cached" | "unavailable" }>("/api/learning", {
        action: "create-assignment", blueprint, goal: goalResult.data, mode: requestMode(),
        sources: preferences.materialSources,
      });
      const parsed = assignmentSchema.parse(result.assignment);
      setApiMode(result.mode ?? null);
      if (parsed.sources.length === 0) setNotice("No source passages were available for this topic. This task uses the company scenario and role rubric.");
      else if (result.research === "unavailable" && roleId === "software-engineer") setNotice("Live engineering research is unavailable; review the attached sources for their provenance.");
      updateSession((current) => {
        let next = appendAssignment(current, parsed);
        if (lessonToContinue) {
          for (const turn of turnsForChannel(current.turns.filter((item) => item.assignmentId === lessonToContinue.id), "mentor")) {
            next = appendTurn(next, { ...turn, id: `${turn.id}-continued-${parsed.id}`, assignmentId: parsed.id });
          }
        }
        return next;
      });
      setPlanningNextTask(false);
      setReviewOpen(false);
      if (entryMode === "teach-first") {
        setCoachFull(true);
        setBusy("mentor");
        try {
          const explanation = await postJson<{ reply: string; turn: ConversationTurn; mode?: ApiMode }>("/api/learning", {
            action: "coach", blueprint, assignment: parsed, mode: requestMode(),
            message: roleId === "software-engineer" ? `Please answer my question first: ${goalResult.data.topic}. Explain it in clear steps with one practical example, then let me ask follow-up questions.` : "Teach me the essential ideas I need for this task, in clear steps with one practical example. Then let me ask follow-up questions.",
            turns: [], intent: "teach", sources: preferences.materialSources,
          });
          const turn = conversationTurnSchema.parse(explanation.turn);
          updateSession((current) => appendTurn(current, turn));
          setApiMode(explanation.mode ?? result.mode ?? null);
        } catch (cause) { setError(`Your task is ready. The lesson could not load: ${getErrorMessage(cause)}`); }
      } else {
        setCoachFull(false);
        setCoachOpen(false);
      }
    } catch (cause) { setError(getErrorMessage(cause)); }
    finally { setBusy(null); }
  }

  async function sendMentor(message = mentorMessage, intent: "teach" | "hint" | "coach" = "coach") {
    const trimmed = message.trim().slice(0, 1000);
    if (!blueprint || !assignment || !session || !trimmed || busy) return;
    setError(null); setBusy("mentor"); setMentorMessage("");
    const studentTurn = createTurn(assignment.id, "mentor", trimmed);
    updateSession((current) => appendTurn(current, studentTurn));
    try {
      const result = await postJson<{ reply: string; turn: ConversationTurn; mode?: ApiMode; learningStyle?: string | null }>("/api/learning", {
        action: "coach", blueprint, assignment, message: trimmed, mode: requestMode(),
        turns: mentorTurns, intent, sources: preferences.materialSources,
      });
      const replyTurn = conversationTurnSchema.parse(result.turn);
      updateSession((current) => appendTurn(current, replyTurn));
      setApiMode(result.mode ?? null);
      if (result.learningStyle !== undefined) setLearningStyle(result.learningStyle);
    } catch (cause) { setError(`Coach reply failed: ${getErrorMessage(cause)}`); setMentorMessage(trimmed); }
    finally { setBusy(null); }
  }

  async function forgetLearningStyle() {
    try {
      const response = await fetch(`/api/learner-preference?companyId=${encodeURIComponent(companyId)}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Could not remove your preference. Try again.");
      setLearningStyle(null);
    } catch (cause) { setError(getErrorMessage(cause)); }
  }

  async function sendCustomer(message = customerMessage, origin: "text" | "voice" = "text") {
    const trimmed = message.trim().slice(0, 1000);
    if (!blueprint || !assignment || assignment.kind !== "conversation" || !session || !trimmed || busy) return;
    setError(null); setBusy("customer"); setCustomerMessage("");
    const studentTurn = createTurn(assignment.id, "customer", trimmed, origin);
    updateSession((current) => appendTurn(current, studentTurn));
    try {
      const result = await postJson<{ reply: string; turn: ConversationTurn; mode?: ApiMode }>("/api/learning", {
        action: "customer-turn", blueprint, assignment, message: trimmed, mode: requestMode(), origin,
        turns: customerTurns,
      });
      const replyTurn = conversationTurnSchema.parse(result.turn);
      updateSession((current) => appendTurn(current, replyTurn));
      setApiMode(result.mode ?? null);
    } catch (cause) { setError(`Customer reply failed: ${getErrorMessage(cause)}`); setCustomerMessage(trimmed); }
    finally { setBusy(null); }
  }

  async function submitWork() {
    if (!blueprint || !assignment || !session || busy) return;
    if (assignment.kind === "code" && !runResult) { setError("Run the code checks before submitting this version of your solution."); return; }
    const sequence = nextAttempt(session, assignment.id);
    const base = { id: crypto.randomUUID(), assignmentId: assignment.id, ...sequence };
    let candidate: unknown;
    if (assignment.kind === "code") candidate = { ...base, kind: "code", code: draft };
    else if (assignment.kind === "written") candidate = { ...base, kind: "written", text: draft };
    else candidate = { ...base, kind: "conversation", turns: customerTurns };
    const parsed = submissionSchema.safeParse(candidate);
    if (!parsed.success || (assignment.kind === "conversation" && !customerTurns.some((turn) => turn.speaker === "student"))) {
      setError(assignment.kind === "conversation" ? "Exchange at least one message with the customer before requesting a review." : "Add your response before submitting it.");
      return;
    }
    setError(null); setBusy("review");
    try {
      const result = await postJson<{ review: Review; mode?: ApiMode }>("/api/review", {
        blueprint, assignment, submission: parsed.data, previousReview: latestReview, runResult: assignment.kind === "code" ? runResult : undefined, mode: requestMode(),
      });
      const review = reviewSchema.parse(result.review);
      updateSession((current) => appendSubmission(current, parsed.data, review));
      setApiMode(result.mode ?? null);
      setReviewOpen(true);
      setNotice(sequence.attempt === 1 ? "Review ready. Your first attempt is saved." : `Attempt ${sequence.attempt} saved with the same rubric.`);
    } catch (cause) { setError(`Review failed. Your work is still here: ${getErrorMessage(cause)}`); }
    finally { setBusy(null); }
  }

  async function uploadMaterial() {
    if (!blueprint || materialBusy) return;
    if (!file && !preferences.materialText.trim()) { setError("Choose a text-based PDF or paste learning material first."); return; }
    setError(null); setMaterialBusy(true);
    try {
      const body = new FormData();
      body.set("companyId", companyId); body.set("roleId", roleId); body.set("topic", prefs.topic.trim());
      if (file) body.set("file", file); else body.set("text", preferences.materialText.trim());
      const response = await fetch("/api/materials", { method: "POST", body });
      const payload: unknown = await response.json().catch(() => ({}));
      if (!response.ok) {
        const failure = payload as ApiError;
        throw new Error(typeof failure.error === "string" ? failure.error : failure.error?.message || failure.message || `Upload failed (${response.status}).`);
      }
      const result = payload as { title: string; passageCount: number; sources: SourceExcerpt[]; mode: "indexed" | "local" };
      const sources = sourceExcerptSchema.array().parse(result.sources);
      const title = result.title || file?.name || "Study material";
      setPreferences((current) => ({ ...current, materialSources: sources, materialTitle: title, materialMode: result.mode, materialText: "" }));
      setFile(null);
      setMaterialOpen(false);
      setNotice(`${title} added · ${result.passageCount} passage${result.passageCount === 1 ? "" : "s"} ${result.mode === "indexed" ? "indexed for retrieval" : "saved locally; vector indexing unavailable"}.`);
    } catch (cause) { setError(`Material could not be added: ${getErrorMessage(cause)}`); }
    finally { setMaterialBusy(false); }
  }

  function reset() {
    if (!blueprint) return;
    resetSession(localStorage, companyId);
    localStorage.removeItem(companyKey(companyId));
    localStorage.removeItem(`hacktx:company-mode:${companyId}`);
    if (localStorage.getItem("hacktx:active-company") === companyId) localStorage.removeItem("hacktx:active-company");
    router.push("/");
  }

  if (!hydrated) return <div className="grid min-h-screen place-items-center bg-[#f5f4ef] text-[#416451]"><LoadingSpinner /></div>;
  if (!blueprint || !session) return <main className="grid min-h-screen place-items-center bg-[#f5f4ef] px-6"><div className="max-w-md rounded-[28px] border border-[#e4e5db] bg-white p-9 text-center shadow-xl shadow-[#253a2a]/5"><div className="mx-auto mb-5 grid size-14 place-items-center rounded-2xl bg-[#edf2ea] text-[#2d614a]"><BriefcaseBusiness /></div><h1 className="text-2xl font-semibold tracking-tight">Company not found</h1><p className="mt-3 text-sm leading-6 text-[#6e786f]">This workspace needs a company saved in this browser. Open another company or create a new one.</p><Link href="/" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#285942] px-5 py-3 text-sm font-semibold text-white">My companies <ArrowRight size={16} /></Link></div></main>;

  const starterTopics = profile?.starterTopics?.length ? profile.starterTopics : fallbackTopics[roleId];
  return (
    <div className="min-h-screen bg-[#f4f4ef] text-[#233b31]">
      <AppNavigation location="role" companyId={companyId} companyName={blueprint.company.name} />
      <div className="mx-auto flex min-h-screen max-w-[1900px]">
        <aside className="hidden w-[236px] shrink-0 flex-col border-r border-[#e3e5db] bg-[#f8f8f4] px-4 py-5 lg:flex">
          <Link href="/" className="px-3 text-xs font-semibold text-[#55755c] hover:underline">← My companies</Link>
          <div className="mt-8 px-3 text-[10px] font-bold tracking-[0.2em] text-[#94a197]">YOUR COMPANY</div>
          <Link href={`/company/${companyId}`} className="mt-3 flex items-center gap-3 rounded-2xl border border-[#e5e8dc] bg-white px-3 py-3 shadow-sm transition hover:border-[#b8cbb6]"><div className="grid size-9 place-items-center rounded-xl bg-[#e8f0e8] text-[#356047]"><BriefcaseBusiness size={18} /></div><div className="min-w-0 flex-1"><p className="truncate text-xs font-bold">{blueprint.company.name}</p><p className="mt-0.5 text-[10px] text-[#88968a]">Back to office</p></div><ArrowRight size={13} className="text-[#9eaa9f]" /></Link>
          <div className="mt-9 px-3 text-[10px] font-bold tracking-[0.2em] text-[#94a197]">MEET YOUR TEAM</div>
          <nav className="mt-3 space-y-1" aria-label="Choose a coworker">
            {roleIds.map((id) => {
              const ThisIcon = roleIcons[id]; const style = roleStyles[id]; const active = id === roleId;
              return <Link key={id} href={`/company/${companyId}/role/${id}`} aria-current={active ? "page" : undefined} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs transition ${active ? "bg-[#e5eee5] font-semibold text-[#244b39]" : "text-[#748177] hover:bg-white hover:text-[#2a4b3b]"}`}><span className="grid size-8 place-items-center rounded-xl" style={{ background: style.tint, color: style.color }}><ThisIcon size={16} /></span><span className="flex-1">{roleLabels[id]}</span>{active && <span className="size-1.5 rounded-full bg-[#3c7f5b]" />}</Link>;
            })}
          </nav>
          <button type="button" onClick={() => setShowResetConfirm(true)} className="mt-auto flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-xs text-[#87928a] hover:text-[#a45845]"><RefreshCw size={14} /> Reset practice</button>
        </aside>

        <main className="min-w-0 flex-1 px-4 pb-10 pt-4 sm:px-7 xl:px-10">
          <header className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-3 text-xs text-[#8b978d]"><Link href={`/company/${companyId}`} className="inline-flex items-center gap-1.5 hover:text-[#285942]"><ArrowLeft size={14} /> Office</Link><span>/</span><span>{roleLabels[roleId]}</span></div><div className="flex items-center gap-2"><span className="rounded-full border border-[#dce6d9] bg-[#f6faf4] px-3 py-1.5 text-[10px] font-semibold text-[#4e7659]">● {blueprint.company.participantMode === "collaborative" ? "Shared company · private coach" : "Single student workspace"}</span><button className="rounded-xl border border-[#e1e5da] bg-white p-2 text-[#758479] hover:text-[#2d5742] lg:hidden" onClick={() => setShowResetConfirm(true)} aria-label="Reset practice"><RefreshCw size={16} /></button></div></header>
          <div className="mt-5 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:hidden" aria-label="Choose a coworker">{roleIds.map((id) => <Link key={id} href={`/company/${companyId}/role/${id}`} className={`shrink-0 rounded-full px-3 py-2 text-xs font-semibold ${id === roleId ? "bg-[#2e6048] text-white" : "bg-white text-[#6a796e]"}`}>{roleLabels[id]}</Link>)}</div>

          <section className="mt-3 flex flex-wrap items-center gap-4 rounded-[20px] border border-[#e2e6da] bg-white px-5 py-4 sm:mt-4 sm:px-6">
            <div className="grid size-11 shrink-0 place-items-center rounded-[14px]" style={{ background: roleStyle.tint, color: roleStyle.color }}><Icon size={22} strokeWidth={1.6} /></div>
            <div className="min-w-0 flex-1"><div className="text-[10px] font-bold tracking-[0.16em]" style={{ color: roleStyle.color }}>{roleStyle.eyebrow}</div><h1 className="mt-0.5 min-w-0 text-[24px] font-semibold leading-tight tracking-[-0.05em] [overflow-wrap:anywhere] sm:text-[28px]">{profile?.name ?? roleLabels[roleId]}<span className="font-normal text-[#62766a]"> · {roleLabels[roleId]}</span></h1><p className="mt-1 max-w-[700px] text-xs leading-5 text-[#68766b] sm:text-sm">{profile?.responsibility ?? roleStyle.action}</p></div>
          </section>

          {blueprint.company.participantMode && <Stage2Panel companyId={companyId} currentRole={roleId} compact />}
          {apiMode === "fixture" && <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#efdbb4] bg-[#fff8e9] px-3 py-2 text-[11px] text-[#8b6836]"><span><strong>Demo fixture:</strong> This response uses local sample content.</span><button type="button" onClick={() => void enableLiveMeta()} disabled={switchingProvider} className="rounded-md border border-[#c9a96e] bg-white px-3 py-1.5 font-bold text-[#755321] hover:bg-[#fff4d9] disabled:opacity-50">{switchingProvider ? "Enabling Meta…" : "Use Meta now"}</button></div>}
          {error && <div role="alert" className="mt-4 flex items-start justify-between gap-4 rounded-xl border border-[#edc7bf] bg-[#fff4f1] px-4 py-3 text-xs leading-5 text-[#a34c3a]"><span>{error}</span><button onClick={() => setError(null)} aria-label="Dismiss error"><X size={16} /></button></div>}
          {notice && <div role="status" className="mt-4 flex items-start justify-between gap-4 rounded-xl border border-[#cce3d0] bg-[#f0faf1] px-4 py-3 text-xs leading-5 text-[#3e7750]"><span>{notice}</span><button onClick={() => setNotice(null)} aria-label="Dismiss notice"><X size={16} /></button></div>}

          <div className={`mt-3 grid gap-4 ${codeFocus ? "engineering-workbench" : "xl:grid-cols-[minmax(0,1fr)_360px]"}`}>
            <div className={codeFocus ? "code-split-grid min-w-0" : "min-w-0 space-y-5"}>
              {!assignment || planningNextTask || lessonActive ? <section className="rounded-[20px] border border-[#e2e6da] bg-white p-5 sm:p-6">
                {assignment && <button type="button" onClick={() => { setPlanningNextTask(false); if (lessonActive) setCoachFull(true); setNotice(null); }} className="mb-4 inline-flex items-center gap-2 rounded-xl border border-[#c8dac7] bg-[#f4f8f1] px-4 py-2 text-xs font-semibold text-[#315f44] hover:bg-[#eaf3e8]"><ArrowLeft size={15} /> {lessonActive ? "Resume lesson" : "Resume current task"}</button>}
                <div className="text-[10px] font-bold tracking-[0.16em] text-[#64816b]">YOUR PRACTICE</div>
                <h2 className="mt-2 text-[24px] font-semibold tracking-[-0.05em]">{roleId === "software-engineer" ? "What would you like to ask Maya?" : "What would you like to work on?"}</h2><p className="mt-1 text-sm text-[#65796a]">{roleId === "software-engineer" ? "Ask a question in your own words, or choose a workplace task below. Maya will start with your question when you choose Teach me first." : "Choose a topic or describe a skill. Your coworker will turn it into a company assignment."}</p>
                <div className="mt-4"><label htmlFor="practice-goal" className="text-xs font-semibold text-[#52685a]">{roleId === "software-engineer" ? "Your question or goal" : "Your focus"}</label><div className="mt-2 flex items-start gap-3 rounded-xl border border-[#dce4d9] bg-[#fcfdfb] px-4 py-3 focus-within:border-[#80a788] focus-within:ring-2 focus-within:ring-[#e4f0e5]"><Target size={17} className="mt-1 shrink-0 text-[#87a08a]" /><textarea id="practice-goal" value={prefs.topic} onChange={(event) => updatePrefs({ topic: event.target.value.slice(0, 300) })} placeholder={roleId === "software-engineer" ? "I just learned about Ford–Fulkerson, but I’m struggling to understand why it’s used and where it applies." : `e.g. ${starterTopics[0].toLowerCase()}`} className="min-h-[72px] w-full resize-y bg-transparent text-sm leading-6 outline-none placeholder:text-[#a5aea4]" maxLength={300} /></div></div>
                <div className="mt-3 flex flex-wrap gap-2">{starterTopics.slice(0, 3).map((topic) => <button type="button" key={topic} onClick={() => updatePrefs({ topic })} className={`rounded-full border px-3.5 py-2 text-xs transition ${prefs.topic === topic ? "border-[#6f9c78] bg-[#eaf4e9] text-[#316447]" : "border-[#e3e7de] bg-white text-[#687a6a] hover:border-[#91b597]"}`}>{topic}</button>)}</div>
                <div className="mt-4 flex flex-wrap items-end justify-between gap-4 border-t border-[#edf0e9] pt-4"><div><div className="text-xs font-semibold text-[#52685a]">Experience level</div><div className="mt-2 flex rounded-xl bg-[#f0f3ec] p-1">{(["beginner", "intermediate", "advanced"] as const).map((level) => <button type="button" key={level} onClick={() => updatePrefs({ difficulty: level })} className={`rounded-lg px-3 py-2 text-xs capitalize transition ${prefs.difficulty === level ? "bg-white font-semibold text-[#2e5b42] shadow-sm" : "text-[#89968a] hover:text-[#526b56]"}`}>{level}</button>)}</div></div><button type="button" onClick={() => setMaterialOpen((open) => !open)} className="inline-flex items-center gap-2 rounded-xl border border-dashed border-[#b7cbb7] bg-[#f8fbf6] px-4 py-2.5 text-xs font-semibold text-[#52765a] hover:bg-[#eff7ee]"><Paperclip size={15} /> {preferences.materialTitle ? "Learning material added" : "Add your learning material"} <ChevronDown size={14} className={materialOpen ? "rotate-180" : ""} /></button></div>
                <div className="mt-5 grid gap-3 sm:grid-cols-2"><button type="button" disabled={!!busy} onClick={() => startAssignment("teach-first")} className="group flex items-center justify-between rounded-xl border border-[#c8dac7] bg-[#eaf3e8] p-4 text-left transition hover:border-[#8baa8a] hover:bg-[#e3f0e2] disabled:opacity-60"><span className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-xl bg-white text-[#39704a]"><BookOpen size={18} /></span><span><strong className="block text-sm">Teach me first</strong><small className="mt-0.5 block text-[11px] text-[#718374]">Learn the essentials, then practice</small></span></span>{busy === "assignment" || busy === "mentor" ? <LoadingSpinner /> : <ArrowRight size={17} className="text-[#5b825e] transition group-hover:translate-x-1" />}</button><button type="button" disabled={!!busy} onClick={() => startAssignment("task-first")} className="group flex items-center justify-between rounded-xl bg-[#285841] p-4 text-left text-white transition hover:bg-[#1c4632] disabled:opacity-60"><span className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-xl bg-white/15"><ArrowRight size={18} /></span><span><strong className="block text-sm">Give me a task</strong><small className="mt-0.5 block text-[11px] text-[#c5ddca]">Jump into a real work scenario</small></span></span>{busy === "assignment" ? <LoadingSpinner /> : <ArrowRight size={17} className="transition group-hover:translate-x-1" />}</button></div>
              </section> : <>
                <div className="col-span-full"><button type="button" onClick={() => { setCoachOpen(false); setPlanningNextTask(true); setNotice("Your current task and work are saved. You can resume them here."); }} className="inline-flex items-center gap-2 rounded-xl border border-[#c8dac7] bg-[#f4f8f1] px-4 py-2 text-xs font-semibold text-[#315f44] hover:bg-[#eaf3e8]"><ArrowLeft size={15} /> Back to practice</button></div>
                <section className="rounded-[26px] border border-[#e2e6da] bg-white p-6 shadow-[0_10px_35px_rgba(41,68,47,0.035)] sm:p-7"><div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2 text-[10px] font-bold tracking-[0.17em] text-[#7b947e]"><span className="grid size-7 place-items-center rounded-full bg-[#e7f0e4] text-[#457253]">02</span> THE ASSIGNMENT</div><span className="rounded-full bg-[#f2f5ed] px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-[#6c826d]">{assignment.goal.difficulty} · {assignment.kind === "code" ? "Code" : assignment.kind === "conversation" ? "Customer roleplay" : "Written brief"}</span></div><h2 className="mt-5 text-[25px] font-semibold tracking-[-0.05em]">{assignment.title}</h2><p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-[#5f7063]">{assignment.brief}</p>{assignment.kind === "code" && assignment.checks[0] && <div className="assignment-example mt-5"><div className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#6b826f]">One example</div><div className="mt-2 grid gap-2 text-xs"><div><span className="block font-semibold text-[#536b58]">Input</span><code className="mt-1 block break-all">{`${assignment.functionName}(${assignment.checks[0].args.map((arg) => JSON.stringify(arg)).join(", ")})`}</code></div><div><span className="block font-semibold text-[#536b58]">Expected output</span><code className="mt-1 block break-all">{JSON.stringify(assignment.checks[0].expected)}</code></div></div></div>}<div className="mt-6 rounded-2xl bg-[#f6f8f3] p-5"><div className="flex items-center gap-2 text-xs font-bold text-[#49664f]"><ClipboardCheck size={16} /> What your coach will look for</div><div className="mt-4 grid gap-3 sm:grid-cols-2">{assignment.rubric.map((criterion) => <div key={criterion.id} className="flex gap-2 text-xs leading-5 text-[#667568]"><CheckCircle2 size={15} className="mt-0.5 shrink-0 text-[#76a47a]" /><span><strong className="block text-[#405c48]">{criterion.label}</strong>{criterion.description}</span></div>)}</div></div><div className="mt-5 flex flex-wrap items-center justify-between gap-3"><span className="text-[11px] text-[#99a59a]">Goal: {assignment.goal.topic}</span><button onClick={() => { setCoachOpen(false); setPlanningNextTask(true); setNotice("Choose a new goal. Your previous task and attempts remain saved."); }} type="button" className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#79937d] hover:text-[#2e6846]"><Plus size={13} /> Start another task</button></div></section>

                <section className="rounded-[26px] border border-[#e2e6da] bg-white p-6 shadow-[0_10px_35px_rgba(41,68,47,0.035)] sm:p-7"><div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2 text-[10px] font-bold tracking-[0.17em] text-[#7b947e]"><span className="grid size-7 place-items-center rounded-full bg-[#e7f0e4] text-[#457253]">03</span> YOUR WORK</div>{attempts.length > 0 && <span className="text-[11px] text-[#829184]">{attempts.length} attempt{attempts.length === 1 ? "" : "s"} saved</span>}</div>
                  {assignment.kind === "code" && <p className="mt-4 text-xs leading-5 text-[#617566]">Start with the function below. Complete the TODO, then run the supplied checks.</p>}
                  {assignment.kind === "code" && <CodeWorkspace assignment={assignment} value={draft} onChange={setDraft} result={runResult} onResult={(result) => setCodeRun(result ? { assignmentId: assignment.id, code: draft, result } : null)} />}
                  {assignment.kind === "written" && <div className="mt-5"><label htmlFor="written-response" className="text-xs font-semibold text-[#526d58]">{assignment.responsePrompt}</label>{assignment.dataset && assignment.dataset.length > 0 && <div className="mt-4 overflow-x-auto rounded-xl border border-[#e3e8df]"><table className="min-w-full text-left text-xs"><thead className="bg-[#f1f5ef] text-[#5a735e]"><tr>{Object.keys(assignment.dataset[0]).map((key) => <th key={key} className="px-3 py-2 font-semibold">{key}</th>)}</tr></thead><tbody>{assignment.dataset.slice(0, 12).map((row, index) => <tr key={index} className="border-t border-[#eef1eb]">{Object.values(row).map((value, cell) => <td key={cell} className="px-3 py-2 text-[#667669]">{String(value ?? "—")}</td>)}</tr>)}</tbody></table></div>}<textarea id="written-response" value={draft} onChange={(event) => setDraft(event.target.value.slice(0, 20000))} className="mt-3 min-h-[230px] w-full resize-y rounded-2xl border border-[#dce5d9] bg-[#fcfdfa] p-5 text-sm leading-7 text-[#3d5544] outline-none placeholder:text-[#a1afa1] focus:border-[#83a88a] focus:ring-2 focus:ring-[#e6f0e4]" placeholder="Write your response here. Think through the customer need, your decision, and why it matters…" /><p className="mt-2 text-right text-[10px] text-[#9baa9a]">{draft.length} / 20,000 characters · saved locally</p></div>}
                  {assignment.kind === "conversation" && <div className="mt-5"><div className="flex items-center gap-3 rounded-2xl bg-[#f3f6f0] p-4"><span className="grid size-10 place-items-center rounded-full bg-white text-[#52765b]"><UserRound size={20} /></span><div><div className="text-xs font-bold text-[#365742]">{assignment.customer.name}</div><p className="text-[11px] text-[#718174]">{assignment.customer.background}</p></div></div><p className="mt-4 text-xs leading-6 text-[#697b6d]">{assignment.customer.need}</p><div className="mt-4 max-h-[360px] min-h-[190px] space-y-3 overflow-y-auto rounded-2xl border border-[#e1e8dd] bg-[#f8faf6] p-4" aria-label="Customer conversation"><div className="max-w-[90%] rounded-2xl rounded-tl-md bg-white p-3 text-xs leading-6 text-[#536b58] shadow-sm">Hello, I’m {assignment.customer.name}. {assignment.customer.need}</div>{customerTurns.map((turn) => <div key={turn.id} className={`max-w-[88%] rounded-2xl p-3 text-xs leading-6 ${turn.speaker === "student" ? "ml-auto rounded-tr-md bg-[#2b6048] text-white" : "rounded-tl-md bg-white text-[#526b58] shadow-sm"}`}>{turn.text}</div>)}{busy === "customer" && <div className="flex items-center gap-2 text-xs text-[#829483]"><LoadingSpinner /> Customer is replying…</div>}<div ref={customerEnd} /></div><CustomerVoiceControls companyId={companyId} disabled={!!busy} lastCustomerReply={customerTurns.filter((turn) => turn.speaker === "customer").at(-1)?.text} onTranscript={(text) => void sendCustomer(text, "voice")} /><form onSubmit={(event) => { event.preventDefault(); void sendCustomer(); }} className="mt-3 flex gap-2"><input aria-label="Reply to customer" value={customerMessage} onChange={(event) => setCustomerMessage(event.target.value)} placeholder="Reply to the customer…" maxLength={1000} className="min-w-0 flex-1 rounded-xl border border-[#dce5d9] bg-white px-4 py-3 text-sm outline-none focus:border-[#83a88a]" /><button type="submit" disabled={!!busy || !customerMessage.trim()} aria-label="Send customer response" className="grid size-11 place-items-center rounded-xl bg-[#285841] text-white disabled:opacity-50"><Send size={16} /></button></form></div>}
                  <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-[#edf0e9] pt-5"><p className="text-[11px] text-[#8d9b90]">Your coach reviews the actual work against the rubric above.</p><button type="button" onClick={() => void submitWork()} disabled={!!busy} className="inline-flex items-center gap-2 rounded-xl bg-[#285841] px-5 py-3 text-xs font-bold text-white shadow-lg shadow-[#2b6244]/10 transition hover:bg-[#1c4632] disabled:opacity-60">{busy === "review" ? <LoadingSpinner /> : <ArrowRight size={15} />}{attempts.length ? `Submit attempt ${attempts.length + 1}` : "Submit for review"}</button></div>
                </section>

                {latestReview && <section className="rounded-[26px] border border-[#cddfc9] bg-[#fafdF9] p-6 shadow-[0_10px_35px_rgba(41,68,47,0.04)] sm:p-7"><button type="button" onClick={() => setReviewOpen((open) => !open)} className="flex w-full items-center justify-between gap-3 text-left"><div className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-xl bg-[#e2f0de] text-[#47805a]"><Check size={18} /></span><div><div className="text-[10px] font-bold tracking-[0.17em] text-[#71977b]">REVIEW READY</div><h3 className="text-lg font-semibold tracking-tight">Attempt {latestSubmission?.attempt} feedback</h3></div></div><ChevronDown size={18} className={`text-[#7a9b7b] transition ${reviewOpen ? "rotate-180" : ""}`} /></button>{reviewOpen && <div className="mt-6"><div className="grid gap-3 sm:grid-cols-2">{assignment.rubric.map((criterion) => { const rating = latestReview.criteria.find((item) => item.criterionId === criterion.id); return <div key={criterion.id} className="rounded-2xl border border-[#e0eadd] bg-white p-4"><div className="flex flex-wrap items-center justify-between gap-2"><strong className="text-xs text-[#3c5e45]">{criterion.label}</strong><span className={`rounded-full px-2 py-1 text-[10px] font-bold capitalize ${rating?.rating === "meets" ? "bg-[#e3f3e1] text-[#39774c]" : rating?.rating === "developing" ? "bg-[#fff1d9] text-[#a47637]" : "bg-[#f9e6e0] text-[#a45b4a]"}`}>{rating?.rating?.replace("-", " ") ?? "Not rated"}</span></div><p className="mt-2 text-[11px] leading-5 text-[#687a6c]">{rating?.evidence}</p><p className="mt-1 text-[11px] leading-5 text-[#8a9a8c]">{rating?.explanation}</p></div>; })}</div><div className="mt-5 grid gap-4 sm:grid-cols-2"><div><h4 className="text-xs font-bold text-[#3d7350]">What worked</h4><ul className="mt-2 space-y-2">{latestReview.strengths.map((item, index) => <li key={index} className="flex gap-2 text-xs leading-5 text-[#667969]"><CheckCircle2 size={14} className="mt-0.5 shrink-0 text-[#6a9b6a]" />{item}</li>)}</ul></div><div><h4 className="text-xs font-bold text-[#a46b4d]">Where to improve</h4><ul className="mt-2 space-y-2">{latestReview.improvements.map((item, index) => <li key={index} className="flex gap-2 text-xs leading-5 text-[#667969]"><Lightbulb size={14} className="mt-0.5 shrink-0 text-[#bf8e5f]" />{item}</li>)}</ul></div></div><div className="mt-5 rounded-xl bg-[#eaf4e8] p-4"><div className="text-xs font-bold text-[#3a6b48]">Your next step</div><p className="mt-1 text-xs leading-6 text-[#5f7865]">{latestReview.nextSteps.join(" ")}</p></div><p className="mt-4 text-[11px] text-[#7b917e]">Edit your work above and submit again. The task and rubric stay the same.</p></div>}</section>}

                {assignment.sources.length > 0 && <section className="rounded-[26px] border border-[#e2e6da] bg-white p-6 sm:p-7"><div className="flex items-center gap-2 text-xs font-bold text-[#4e7056]"><BookOpen size={16} /> Sources behind this task</div><div className="mt-4 space-y-2">{assignment.sources.map((source) => <SourceCard key={source.id} source={source} onOpen={() => setSourceDetail(source)} />)}</div></section>}
              </>}
              {materialOpen && <section id="material-panel" className="rounded-[26px] border border-[#dbe4d7] bg-white p-6 sm:p-7"><div className="flex items-center justify-between"><div><div className="flex items-center gap-2 text-xs font-bold text-[#41694d]"><Upload size={16} /> Add learning material</div><p className="mt-2 text-xs leading-5 text-[#758578]">One text-based PDF or pasted passage per company. Your next task can use it as source material.</p></div><button onClick={() => setMaterialOpen(false)} aria-label="Close material panel" className="p-1 text-[#869689]"><X size={17} /></button></div><label className="mt-5 block cursor-pointer rounded-2xl border border-dashed border-[#bbd0ba] bg-[#f8fbf7] p-5 text-center text-xs text-[#67816b] hover:border-[#6b9b72]"><Upload size={21} className="mx-auto mb-2 text-[#66946d]" />{file ? file.name : "Choose a text-based PDF"}<input type="file" accept="application/pdf,.pdf" className="sr-only" onChange={(event) => setFile(event.target.files?.[0] ?? null)} /></label><div className="my-4 text-center text-[10px] font-bold tracking-widest text-[#a6b3a6]">OR PASTE TEXT</div><textarea value={preferences.materialText} onChange={(event) => setPreferences((current) => ({ ...current, materialText: event.target.value.slice(0, 20000) }))} className="min-h-28 w-full resize-y rounded-xl border border-[#dce5d9] p-4 text-xs leading-6 outline-none focus:border-[#87ae8b]" placeholder="Paste notes, a lesson excerpt, or a topic you are studying…" /><button type="button" disabled={materialBusy} onClick={() => void uploadMaterial()} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#285841] px-5 py-3 text-xs font-bold text-white disabled:opacity-60">{materialBusy ? <LoadingSpinner /> : <Plus size={15} />} Add material</button></section>}
              {preferences.materialTitle && !materialOpen && !assignment && <section className="rounded-2xl border border-[#e0e8dc] bg-[#f9fcf7] p-4"><div className="flex items-center gap-2 text-xs font-semibold text-[#497252]"><FileText size={16} /> {preferences.materialTitle}</div><p className="mt-1 text-[11px] text-[#7b8d7e]">{preferences.materialSources.length} source passages · {preferences.materialMode === "indexed" ? "indexed for retrieval" : "saved locally"}</p></section>}
            </div>

            {codeFocus && <button ref={coachTrigger} type="button" className="coach-launcher" onClick={() => setCoachOpen(true)} aria-expanded={coachOpen} aria-controls="coach-panel"><BrainCircuit size={18} /> Ask {profile?.name?.split(" ")[0] ?? "your coach"}</button>}
            {coachModal && <button type="button" className="coach-drawer-backdrop" aria-label="Close coach panel" onClick={closeCoachPanel} />}
            <aside id="coach-panel" ref={coachPanel} role={coachModal ? "dialog" : undefined} aria-modal={coachModal ? true : undefined} aria-label={coachModal ? `Learn with ${profile?.name?.split(" ")[0] ?? "your coach"}` : undefined} hidden={codeFocus && !coachOpen && !coachFull} className={coachFull ? "coach-full" : codeFocus ? "coach-drawer" : "min-w-0 xl:sticky xl:top-5 xl:self-start"}>
              <div className="flex min-h-[500px] flex-col overflow-hidden rounded-[26px] border border-[#d9e2d7] bg-white shadow-[0_14px_48px_rgba(41,68,47,0.055)] xl:h-[calc(100vh-40px)]">
                <div className="flex items-center gap-3 border-b border-[#edf0e9] px-5 py-4">
                  <span className="grid size-10 place-items-center rounded-2xl bg-[#e8f2e6] text-[#468156]"><BrainCircuit size={20} /></span>
                  <div className="min-w-0 flex-1"><div className="text-sm font-bold tracking-tight">{lessonActive ? "Learn with" : "Ask"} {profile?.name?.split(" ")[0] ?? "your coach"}</div><div className="text-[11px] text-[#89988b]">{lessonActive ? "One idea and one step at a time" : "Questions, hints, and honest feedback"}</div></div>
                  {!coachModal && <button id="coach-expand" type="button" onClick={() => setCoachFull(true)} aria-label="Expand coach conversation" className="inline-flex size-9 items-center justify-center rounded-full text-[#526d58] hover:bg-[#f0f5ee]"><Maximize2 size={17} /></button>}
                  {coachModal && <button ref={coachClose} type="button" onClick={closeCoachPanel} aria-label="Close coach conversation" className="inline-flex size-9 items-center justify-center rounded-full text-[#526d58] hover:bg-[#f0f5ee]"><X size={18} /></button>}
                </div>
                {learningStyle && <div className="mx-5 mt-3 flex items-center justify-between gap-3 rounded-xl border border-[#d8e6d8] bg-[#f4f9f1] px-3 py-2 text-xs text-[#496b50]"><span><strong>Learning preference</strong><br />{learningStyle}</span><button type="button" onClick={() => void forgetLearningStyle()} className="shrink-0 rounded-lg border border-[#c9d9c8] px-2 py-1 font-semibold hover:bg-white" aria-label="Remove learning preference">Remove</button></div>}
                <div className="coach-conversation min-h-0 flex-1 space-y-4 overflow-y-auto bg-[#fcfdfb] px-5 py-5" aria-label="Coach conversation" role="log" aria-live="polite">
                  <div className="rounded-2xl rounded-tl-md border border-[#e8ede5] bg-white p-4 text-xs leading-6 text-[#5e7362] shadow-sm">Hi! I?m here to help you practice {roleLabels[roleId].toLowerCase()} at {blueprint.company.name}. Choose a topic, then ask me anything as you work. I?ll guide you without doing the work for you.</div>
                  {mentorTurns.map((turn) => <div key={turn.id} className={`rounded-2xl p-3.5 text-xs leading-6 ${turn.speaker === "student" ? "ml-5 rounded-tr-md bg-[#e5efe3] text-[#405d48]" : "mr-5 rounded-tl-md border border-[#e8ede5] bg-white text-[#5d725f] shadow-sm"}`}><div className="mb-1 text-[10px] font-bold uppercase tracking-widest text-[#8aa08e]">{turn.speaker === "student" ? "You" : profile?.name?.split(" ")[0] ?? "Coach"}</div><CoachMessage text={turn.text} /></div>)}
                  {busy === "mentor" && <div className="flex items-center gap-2 text-xs text-[#79937e]"><LoadingSpinner /> Your coach is thinking?</div>}
                  <div ref={mentorEnd} />
                </div>
                <div className="border-t border-[#edf0e9] bg-white p-4">
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <button type="button" disabled={!assignment || !!busy} onClick={() => void sendMentor("Give me a small hint for the next step without the full answer.", "hint")} className="rounded-full border border-[#dbe7d9] bg-[#f7faf5] px-3 py-1.5 text-[10px] font-semibold text-[#5c7d61] disabled:opacity-45">Give me a hint</button>
                    <button type="button" disabled={!assignment || !!busy} onClick={() => void sendMentor(lessonActive ? "Show the next step with one small example, then let me try." : "Explain the most important concept behind this task with a practical example.", "teach")} className="rounded-full border border-[#dbe7d9] bg-[#f7faf5] px-3 py-1.5 text-[10px] font-semibold text-[#5c7d61] disabled:opacity-45">{lessonActive ? "Show next step" : "Explain a concept"}</button>
                    {lessonActive && <button type="button" disabled={!!busy} onClick={() => void startAssignment("task-first")} className="ml-auto inline-flex items-center gap-1 rounded-full bg-[#285841] px-4 py-2 text-[11px] font-semibold text-white disabled:opacity-50">Try the challenge <ArrowRight size={14} /></button>}
                  </div>
                  <form onSubmit={(event) => { event.preventDefault(); void sendMentor(); }} className="flex items-end gap-2 rounded-2xl border border-[#dce7d9] bg-[#fbfdfb] p-2 focus-within:border-[#8fb595]"><textarea aria-label="Ask your coach" value={mentorMessage} onChange={(event) => setMentorMessage(event.target.value.slice(0, 1000))} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void sendMentor(); } }} disabled={!assignment} rows={2} placeholder={assignment ? "Ask a question or request a hint?" : "Start a task to chat with your coach"} className="min-h-12 min-w-0 flex-1 resize-none bg-transparent px-2 py-1 text-xs leading-5 outline-none placeholder:text-[#a4b1a5] disabled:opacity-60" /><button type="submit" disabled={!assignment || !!busy || !mentorMessage.trim()} aria-label="Send question to coach" className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#2c6046] text-white disabled:opacity-45"><Send size={15} /></button></form>
                  <p className="mt-2 text-[10px] text-[#a0ada1]">Your conversation stays here as you move into the task.</p>
                </div>
              </div>
            </aside>
          </div>
        </main>
      </div>
      <DetailSheet open={Boolean(sourceDetail)} title={sourceDetail?.title ?? "Source passage"} onClose={() => setSourceDetail(null)}>
        {sourceDetail && <><p className="library-eyebrow">{sourceDetail.provenance.toUpperCase()} SOURCE{sourceDetail.location ? ` · ${sourceDetail.location}` : ""}</p><p className="mt-4 whitespace-pre-wrap">{sourceDetail.excerpt}</p>{sourceDetail.url && <a className="mt-6 inline-flex text-sm font-semibold text-[#2e7050] underline underline-offset-2" href={sourceDetail.url} target="_blank" rel="noreferrer">Open original source ↗</a>}</>}
      </DetailSheet>
      {showResetConfirm && <div role="dialog" aria-modal="true" aria-labelledby="reset-title" className="fixed inset-0 z-50 grid place-items-center bg-[#14291d]/45 px-4"><div className="w-full max-w-sm rounded-[25px] bg-white p-7 shadow-2xl"><div className="grid size-11 place-items-center rounded-xl bg-[#fff0e8] text-[#ba7454]"><CircleHelp size={22} /></div><h2 id="reset-title" className="mt-5 text-xl font-semibold">Reset practice?</h2><p className="mt-2 text-sm leading-6 text-[#728174]">This clears this demo company and its locally saved work, then returns to company creation. Indexed passages from this company stay isolated from the next one.</p><div className="mt-6 flex gap-3"><button type="button" onClick={() => setShowResetConfirm(false)} className="flex-1 rounded-xl border border-[#dbe4d9] px-4 py-2.5 text-xs font-semibold">Keep my work</button><button type="button" onClick={reset} className="flex-1 rounded-xl bg-[#a95542] px-4 py-2.5 text-xs font-semibold text-white">Start fresh</button></div></div></div>}
    </div>
  );
}

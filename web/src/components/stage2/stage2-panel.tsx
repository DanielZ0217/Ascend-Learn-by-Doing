"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, ClipboardCopy, FileText, MessageSquareText, Pause, Play, Send, UsersRound, X } from "lucide-react";
import {
  assignmentSchema, roleIds, roleLabels, type Assignment, type CompanyBlueprint, type RoleId,
  type Stage2Event, type Stage2Message, type Stage2Participant, type Stage2Settings,
} from "@/lib/contracts";
import { appendAssignment, readSession, saveSession } from "@/lib/session/store";
import { DetailSheet } from "@/components/ui/detail-sheet";

type SharedRun = {
  status: "running" | "paused"; sequence: number; pausedEventId: string | null;
  pauseRoleId: RoleId | null; assignment: Assignment | null;
  assignmentMode: "live" | "fixture" | null;
  assignmentProvider: "bedrock" | "meta" | "fixture" | null;
  taskOwnerId: string | null; taskCompleted: boolean;
};
type PracticeTask = {
  id: string; status: "preview" | "active" | "completed"; teamSize: number;
  title: string; context: string; createdAt: string;
  parts: { id: string; roleId: RoleId; ownerId: string; ownerName: string; assignment: Assignment;
    status: "assigned" | "completed"; reviewedBody: string | null; artifactId: string | null }[];
};
const practiceRoles: RoleId[] = ["customer-support", "software-engineer", "product-manager", "data-analyst", "sales-marketing"];
type SharedState = {
  blueprint: CompanyBlueprint; settings: Stage2Settings; self: Stage2Participant;
  isOwner: boolean; joinCode: string | null;
  participants: Stage2Participant[]; messages: Stage2Message[];
  events: Stage2Event[]; run: SharedRun | null; practiceTask: PracticeTask | null;
};

async function jsonResponse(response: Response) {
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error?.message ?? "The shared company could not respond.");
  return payload;
}

export function Stage2Panel({ companyId, currentRole, compact = false }: {
  companyId: string; currentRole: RoleId; compact?: boolean;
}) {
  const router = useRouter();
  const [state, setState] = useState<SharedState | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [text, setText] = useState("");
  const [kind, setKind] = useState<"message" | "prd" | "clarification">("message");
  const [aiRequest, setAiRequest] = useState("What should we clarify before the next handoff?");
  const [aiRole, setAiRole] = useState<RoleId>("software-engineer");
  const [artifact, setArtifact] = useState<{ title: string; body: string; kind: string } | null>(null);
  const [inviteCopied, setInviteCopied] = useState(false);
  const [expanded, setExpanded] = useState(!compact);
  const [mobileThreadOpen, setMobileThreadOpen] = useState(false);
  const [mobileView, setMobileView] = useState(false);
  const [detailEvent, setDetailEvent] = useState<Stage2Event | null>(null);
  const inflight = useRef(false);
  const artifactDialog = useRef<HTMLDialogElement>(null);
  const messageList = useRef<HTMLDivElement>(null);
  const previousMessageCount = useRef(0);
  const followLatestMessage = useRef(true);
  const threadTrigger = useRef<HTMLButtonElement>(null);
  const threadClose = useRef<HTMLButtonElement>(null);
  const threadPanel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const query = window.matchMedia("(max-width: 600px)");
    const update = () => setMobileView(query.matches);
    update(); query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!mobileThreadOpen || !mobileView) return;
    const before = document.body.style.overflow;
    const trigger = threadTrigger.current;
    document.body.style.overflow = "hidden";
    threadClose.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileThreadOpen(false);
      if (event.key !== "Tab") return;
      const controls = threadPanel.current?.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled])');
      if (!controls?.length) return;
      const first = controls[0], last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = before; window.removeEventListener("keydown", onKey); trigger?.focus(); };
  }, [mobileThreadOpen, mobileView]);

  useEffect(() => {
    if (artifact && artifactDialog.current && !artifactDialog.current.open) artifactDialog.current.showModal();
  }, [artifact]);

  useEffect(() => {
    const list = messageList.current;
    if (!list) return;
    const count = state?.messages.length ?? 0;
    if (count > previousMessageCount.current && followLatestMessage.current) list.scrollTop = list.scrollHeight;
    previousMessageCount.current = count;
  }, [state?.messages.length, expanded]);

  const refresh = useCallback(async () => {
    if (inflight.current || document.visibilityState === "hidden") return;
    inflight.current = true;
    try {
      let response = await fetch(`/api/stage2?companyId=${encodeURIComponent(companyId)}`, { cache: "no-store" });
      if (response.status === 401) {
        const inviteToken = localStorage.getItem(`hacktx:invite:${companyId}`);
        const joinCode = localStorage.getItem(`hacktx:join-code:${companyId}`);
        const displayName = localStorage.getItem(`hacktx:name:${companyId}`);
        if ((inviteToken || joinCode) && displayName) {
          const joined = await fetch("/api/stage2/join", { method: "POST", headers: { "content-type": "application/json" },
            body: JSON.stringify(inviteToken ? { companyId, inviteToken, displayName } : { joinCode, displayName }) });
          if (joined.ok) response = await fetch(`/api/stage2?companyId=${encodeURIComponent(companyId)}`, { cache: "no-store" });
        }
      }
      if (response.status === 404 || response.status === 401) {
        for (const key of Object.keys(localStorage)) if (key.startsWith("hacktx:") && key.includes(companyId)) localStorage.removeItem(key);
        if (localStorage.getItem("hacktx:active-company") === companyId) localStorage.removeItem("hacktx:active-company");
        for (const key of Object.keys(sessionStorage)) if (key.startsWith("hacktx:") && key.includes(companyId)) sessionStorage.removeItem(key);
        router.replace("/");
        return;
      }
      const next = await jsonResponse(response) as SharedState;
      localStorage.setItem(`hacktx:owner:${companyId}`, next.isOwner ? "true" : "false");
      window.dispatchEvent(new CustomEvent("hacktx:ownership", { detail: { companyId, isOwner: next.isOwner } }));
      setState(next);
      setError("");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Shared company unavailable."); }
    finally { inflight.current = false; }
  }, [companyId, router]);

  useEffect(() => {
    const initial = window.setTimeout(() => void refresh(), 0);
    const interval = window.setInterval(() => void refresh(), 5000);
    const visible = () => { if (document.visibilityState === "visible") void refresh(); };
    const leaving = () => {
      navigator.sendBeacon?.("/api/stage2", new Blob([JSON.stringify({ action: "leave", companyId })], { type: "application/json" }));
    };
    document.addEventListener("visibilitychange", visible);
    window.addEventListener("pagehide", leaving);
    return () => {
      window.clearTimeout(initial); window.clearInterval(interval);
      document.removeEventListener("visibilitychange", visible);
      window.removeEventListener("pagehide", leaving);
    };
  }, [companyId, refresh]);

  async function act(action: Record<string, unknown>) {
    setBusy(String(action.action)); setError("");
    try {
      const payload = await jsonResponse(await fetch("/api/stage2", { method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ companyId, ...action }) }));
      await refresh();
      return payload;
    } catch (cause) { setError(cause instanceof Error ? cause.message : "The action could not be completed."); return null; }
    finally { setBusy(""); }
  }

  async function send() {
    if (!text.trim()) return;
    const messageRole = state?.self.activeRole ?? currentRole;
    const actualKind = kind === "prd" && messageRole !== "customer-support" ? "message" : kind;
    const result = await act({ action: "message", roleId: messageRole, kind: actualKind, text: text.trim() });
    if (result) { setText(""); setKind("message"); }
  }

  async function copyInvite() {
    const code = state?.joinCode;
    if (!code) { setError("Only the creator can see the current company code."); return; }
    try {
      await navigator.clipboard.writeText(code);
      setInviteCopied(true);
      window.setTimeout(() => setInviteCopied(false), 2500);
    } catch { setError("Could not copy the code. Check browser clipboard permission."); }
  }

  async function openArtifact(artifactId: string) {
    try {
      const payload = await jsonResponse(await fetch(`/api/stage2/artifact?companyId=${encodeURIComponent(companyId)}&artifactId=${encodeURIComponent(artifactId)}`, { cache: "no-store" }));
      setArtifact(payload.artifact);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Artifact unavailable."); }
  }

  async function takeTask() {
    const result = await act({ action: "claim" });
    if (!result?.assignment || !state) return;
    const assignment = assignmentSchema.parse(result.assignment);
    const saved = readSession(localStorage, state.blueprint);
    if (!saved.assignments.some((item) => item.id === assignment.id)) saveSession(localStorage, appendAssignment(saved, assignment));
    window.dispatchEvent(new Event("hacktx:stage2-task"));
    router.push(`/company/${encodeURIComponent(companyId)}/role/${assignment.roleId}`);
  }

  function openPracticePart(part: PracticeTask["parts"][number]) {
    if (!state || part.ownerId !== state.self.id) return;
    const saved = readSession(localStorage, state.blueprint);
    if (!saved.assignments.some((item) => item.id === part.assignment.id))
      saveSession(localStorage, appendAssignment(saved, assignmentSchema.parse(part.assignment)));
    window.dispatchEvent(new Event("hacktx:stage2-task"));
    router.push(`/company/${encodeURIComponent(companyId)}/role/${part.roleId}`);
  }

  if (!state && !error) return <section className="stage2-panel stage2-wait" aria-label="Shared company"><UsersRound size={17} /> Connecting to the company conversation…</section>;
  if (!state) return <section className="stage2-panel stage2-wait" aria-label="Shared company"><span>{error}</span><button type="button" onClick={() => void refresh()}>Try again</button></section>;
  const { blueprint, settings, participants, messages, events, run, self, practiceTask } = state;
  const messageRole = self.activeRole ?? currentRole;
  const latestEvent = events.at(-1);
  const customerEvent = events.find((event) => event.issueKind === "customer-request");
  const hasPrd = messages.some((message) => message.kind === "prd" && message.status === "delivered");
  const hasReviewedFeature = messages.some((message) => message.kind === "implementation" && message.text.startsWith("Completed a reviewed code task"));
  const isRealWorld = settings.experienceMode === "real-world";
  const canTakeTask = run?.assignment && (!run.taskOwnerId || run.taskOwnerId === self.id);

  if (compact && !expanded) return <section className="stage2-summary" aria-label="Shared company workspace">
    <div><span className="stage2-kicker">SHARED COMPANY · {settings.companyStage.toUpperCase()}</span><strong>{isRealWorld ? run?.status === "paused" ? "Company paused for work" : "Company activity is running" : practiceTask?.status === "active" ? practiceTask.title : "The team conversation"}</strong><small>{participants.length} / {settings.participantMode === "collaborative" ? 5 : 1} here · {messages.length} team messages{isRealWorld ? ` · ${events.length} simulated events` : practiceTask?.status === "active" ? ` · ${practiceTask.parts.filter((part) => part.status === "completed").length}/${practiceTask.parts.length} parts reviewed` : ""}</small></div>
    <button type="button" className="stage2-quiet-button" onClick={() => setExpanded(true)}>Open team workspace <ArrowRight size={14} /></button>
  </section>;

  return <section className={`stage2-panel ${compact ? "stage2-compact" : ""}`} aria-label="Shared company workspace">
    <div className="stage2-panel-top"><div><span className="stage2-kicker">COMPANY WORKSPACE · {settings.companyStage.toUpperCase()}</span><h2>{isRealWorld ? "A company in motion" : "The team conversation"}</h2><p>{settings.participantMode === "collaborative" ? "Up to five students, one company. Your private coach stays in your role workspace." : "Your company thread and learning work stay connected."}</p></div><div className="stage2-panel-actions"><span className="stage2-presence"><UsersRound size={14} /> {participants.length} / {settings.participantMode === "collaborative" ? 5 : 1} here</span>{settings.participantMode === "collaborative" && state.isOwner && state.joinCode && <button type="button" onClick={() => void copyInvite()} className="stage2-quiet-button" aria-label={`Copy company join code ${state.joinCode}`}><ClipboardCopy size={14} /> Join code: <strong>{state.joinCode}</strong> {inviteCopied ? "Copied" : "Copy"}</button>}{compact && <button type="button" onClick={() => setExpanded(false)} className="stage2-quiet-button">Hide team workspace</button>}</div></div>
    {settings.participantMode === "collaborative" && state.isOwner && <p className="stage2-lan-note">Teammates open ascendsim.tech, choose Join, and enter this code with their name.</p>}
    {error && <p className="stage2-error" role="alert">{error}</p>}
    {!isRealWorld && settings.participantMode === "collaborative" && <section className="stage2-practice" aria-label="Team Practice task">
      <div className="stage2-section-heading"><div><span>01 / TEAM PRACTICE</span><h3>{practiceTask?.status === "completed" ? "Team task complete" : practiceTask?.status === "active" ? "Shared assignment" : "Take a team task"}</h3></div><UsersRound size={18} /></div>
      {practiceTask ? <><strong className="stage2-practice-title">{practiceTask.title}</strong><p>{practiceTask.context}</p></> : <p>When two to five students are here, take one customer feature request together. Each teammate gets a reviewed part.</p>}
      {practiceTask?.status === "preview" && <div className="stage2-practice-preview"><p className="stage2-kicker">PREVIEW · {practiceTask.teamSize} STUDENTS</p><p>Choose one distinct role each. The required roles are:</p><ol>{practiceRoles.slice(0, practiceTask.teamSize).map((role) => {
        const person = participants.find((item) => item.activeRole === role);
        return <li key={role}><strong>{roleLabels[role]}</strong><span>{person?.displayName ?? "Needs a student"}</span></li>;
      })}</ol><p>Support writes the customer brief. Engineering implements the checked change after Support review. Product, Data, and Marketing join as team size grows.</p></div>}
      {practiceTask?.parts.length ? <div className="stage2-practice-parts">{practiceTask.parts.map((part) => {
        const ownerHere = participants.some((person) => person.id === part.ownerId);
        const owned = part.ownerId === self.id;
        const dependency = part.roleId === "software-engineer" && practiceTask.parts.find((item) => item.roleId === "customer-support")?.status !== "completed"
          ? "Final submission waits for Support's reviewed brief."
          : part.roleId === "sales-marketing" && practiceTask.parts.some((item) => item.roleId !== "sales-marketing" && item.status !== "completed")
            ? "Final message waits for verified team outcomes." : null;
        return <article key={part.id} className="stage2-practice-part"><div><span className="stage2-kicker">{roleLabels[part.roleId]} · {part.status === "completed" ? "REVIEWED" : ownerHere ? "IN PROGRESS" : "OWNER AWAY"}</span><h4>{part.assignment.title}</h4><small>{part.ownerName}</small><p>{part.assignment.brief.split("\n\n").at(-1)}</p>{dependency && <p className="stage2-practice-dependency">{dependency}</p>}{part.reviewedBody && <details><summary>Read reviewed handoff</summary><pre>{part.reviewedBody}</pre></details>}</div><div className="stage2-practice-part-actions">{owned && <button type="button" className="stage2-quiet-button" onClick={() => openPracticePart(part)}>Open my part <ArrowRight size={13} /></button>}{!ownerHere && part.status !== "completed" && <button type="button" disabled={!!busy || self.activeRole !== part.roleId} className="stage2-quiet-button" onClick={() => void act({ action: "practice-reassign", partId: part.id })}>Take this part</button>}</div></article>;
      })}</div> : null}
      {practiceTask?.status !== "active" && <div className="stage2-practice-actions"><label>Your role for this team task <select value={self.activeRole ?? ""} onChange={(event) => void act({ action: "role", roleId: event.target.value })}><option value="">Choose a role</option>{roleIds.map((role) => <option key={role} value={role}>{roleLabels[role]}</option>)}</select></label>{practiceTask?.status === "preview" ? <div className="stage2-pause-actions">{participants.length !== practiceTask.teamSize && <button type="button" className="stage2-quiet-button" disabled={!!busy || participants.length < 2} onClick={() => void act({ action: "practice-preview" })}>Update for {participants.length} students</button>}<button type="button" className="stage2-primary-button" disabled={!!busy || participants.length !== practiceTask.teamSize || new Set(participants.map((person) => person.activeRole)).size !== practiceTask.teamSize || practiceRoles.slice(0, practiceTask.teamSize).some((role) => !participants.some((person) => person.activeRole === role))} onClick={() => void act({ action: "practice-start" })}>Start team task <ArrowRight size={13} /></button></div> : <button type="button" className="stage2-primary-button" disabled={!!busy || participants.length < 2} onClick={() => void act({ action: "practice-preview" })}>Take team task <ArrowRight size={13} /></button>}</div>}
      {practiceTask?.status === "active" && practiceTask.parts.some((part) => part.status !== "completed" && !participants.some((person) => person.id === part.ownerId)) && <p className="stage2-practice-reassign"><label>Select a role before taking an absent teammate&apos;s part <select value={self.activeRole ?? ""} onChange={(event) => void act({ action: "role", roleId: event.target.value })}><option value="">Choose a role</option>{roleIds.map((role) => <option key={role} value={role}>{roleLabels[role]}</option>)}</select></label></p>}
    </section>}
    <button ref={threadTrigger} type="button" className="stage2-mobile-thread-trigger" onClick={() => setMobileThreadOpen(true)}><MessageSquareText size={16} /> Team conversation <span>{messages.length}</span></button>
    {mobileThreadOpen && <button type="button" className="stage2-mobile-thread-backdrop" aria-label="Close team conversation" onClick={() => setMobileThreadOpen(false)} />}
    <div className={`stage2-columns ${!isRealWorld ? "stage2-thread-only" : ""}`}>
      {isRealWorld && <div className="stage2-activity"><div className="stage2-section-heading"><div><span>01 / ACTIVITY</span><h3>Company log</h3></div><span aria-live="polite" className={`stage2-run-status ${run?.status === "paused" ? "paused" : ""}`}>{run?.status === "paused" ? "Paused for work" : "Running"}</span></div>
        <p className="stage2-section-intro">Simulated events appear about every five seconds while someone is here. Real student work is shown in the team thread.</p>
        <div className="stage2-event-list" aria-label="Simulated company activity">{events.length ? events.slice(-12).reverse().map((event) => <article key={event.id} className="stage2-event"><div><span className="stage2-event-number">{String(event.sequence).padStart(3, "0")}</span><span className="stage2-event-role">{roleLabels[event.roleId]}</span><time dateTime={event.createdAt}>{new Date(event.createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</time></div><h4>{event.headline}</h4><p>{event.detail}</p><small>Simulated outcome · {event.outcome}</small><button type="button" className="stage2-event-detail" onClick={() => setDetailEvent(event)}>View event</button></article>) : <p className="stage2-empty">The first company event is arriving.</p>}</div>
        <div className="stage2-pause-bar">{run?.status === "paused" ? <><div><strong>Company paused</strong><small>{run.taskCompleted ? "The reviewed task is complete. Resume when ready." : run.assignment ? `${roleLabels[run.assignment.roleId]} task ready · ${run.assignmentProvider === "fixture" ? "demo fixture" : "live AI"}` : "Preparing a task from the current event…"}</small></div><div className="stage2-pause-actions">{canTakeTask && !run.taskCompleted && <button type="button" disabled={!!busy} onClick={() => void takeTask()} className="stage2-primary-button">Take task <ArrowRight size={14} /></button>}{run.taskOwnerId && run.taskOwnerId !== self.id && <span className="stage2-claimed">Teammate is working</span>}<button type="button" disabled={!!busy} onClick={() => void act({ action: "resume" })} className="stage2-quiet-button"><Play size={13} /> Resume</button></div></> : <><div><strong>Take a moment to do the work</strong><small>Pause both views and open a task from the current company event.</small></div><button type="button" disabled={!!busy || !latestEvent} onClick={() => void act({ action: "pause", roleId: currentRole })} className="stage2-primary-button"><Pause size={13} /> Pause for task</button></>}</div>
      </div>}
      <div ref={threadPanel} className={`stage2-thread ${mobileThreadOpen ? "mobile-open" : ""}`} role={mobileView && mobileThreadOpen ? "dialog" : "region"} aria-modal={mobileView && mobileThreadOpen ? true : undefined} aria-label="Team conversation"><button ref={threadClose} type="button" className="stage2-mobile-thread-close" onClick={() => setMobileThreadOpen(false)}><X size={17} /> Close</button><div className="stage2-section-heading"><div><span>{isRealWorld ? "02" : "01"} / SHARED THREAD</span><h3>Team conversation</h3></div><MessageSquareText size={18} /></div><p className="stage2-section-intro">Support writes the problem brief. Engineering asks what is missing and builds the feature. AI coworkers can draft internal replies when asked.</p>
        <div className="stage2-challenge">{practiceTask ? <><span className="stage2-kicker">TEAM PRACTICE TEMPLATE</span><strong>{practiceTask.title}</strong><p>{practiceTask.context}</p><ol>{practiceTask.parts.map((part, index) => <li key={part.id} data-complete={part.status === "completed"}><span>{part.status === "completed" ? "✓" : index + 1}</span> {roleLabels[part.roleId]}: {part.assignment.title}</li>)}</ol></> : <><span className="stage2-kicker">SUPERVISOR SCENARIO · {settings.generationMode === "fixture" ? "DEMO FIXTURE" : "AI"}</span><strong>{customerEvent?.headline ?? "A customer needs a better experience"}</strong><p>{blueprint.scenario} {customerEvent?.detail}</p><ol><li data-complete={hasPrd}><span>{hasPrd ? "✓" : "1"}</span> Support writes the customer problem brief.</li><li data-complete={hasReviewedFeature}><span>{hasReviewedFeature ? "✓" : "2"}</span> Engineering builds and checks the feature.</li></ol></>}</div>
        <div ref={messageList} onScroll={(event) => { const list = event.currentTarget; followLatestMessage.current = list.scrollHeight - list.scrollTop - list.clientHeight < 32; }} className="stage2-message-list" aria-label="Shared company conversation" aria-live="polite" aria-relevant="additions">{messages.length ? messages.map((message) => <article key={message.id} className={`stage2-message ${message.status !== "delivered" ? "stage2-message-pending" : ""}`}><div className="stage2-message-meta"><strong>{message.authorName}</strong><span>{roleLabels[message.roleId]}</span><time dateTime={message.createdAt}>{new Date(message.createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</time></div><p>{message.text}</p><div className="stage2-message-foot"><span>{message.authorType === "student" ? "Student work" : message.source === "fixture" ? "AI demo fixture" : `AI · ${message.source}`}{message.status !== "delivered" ? ` · ${message.status}` : ""}</span>{message.artifactId && <button type="button" onClick={() => void openArtifact(message.artifactId!)}><FileText size={12} /> Open {message.kind === "prd" ? "PRD" : "artifact"}</button>}</div>{message.status === "pending" && <div className="stage2-approval-actions"><button type="button" disabled={!!busy} onClick={() => void act({ action: "approve", messageId: message.id, approved: true })}><Check size={13} /> Approve</button><button type="button" disabled={!!busy} onClick={() => void act({ action: "approve", messageId: message.id, approved: false })}><X size={13} /> Reject</button></div>}</article>) : <p className="stage2-empty">No messages yet. Start with the customer problem brief or ask a coworker for a draft.</p>}</div>
        <form className="stage2-compose" onSubmit={(event) => { event.preventDefault(); void send(); }}><div className="stage2-compose-top"><label>Write as {roleLabels[messageRole]}<select aria-label="Message type" value={kind} onChange={(event) => setKind(event.target.value as typeof kind)}><option value="message">Message</option>{messageRole === "customer-support" && <option value="prd">Problem brief / PRD</option>}{(messageRole === "software-engineer" || messageRole === "customer-support") && <option value="clarification">Clarification</option>}</select></label></div><textarea aria-label="Shared team message" value={text} onChange={(event) => setText(event.target.value.slice(0, 12000))} placeholder={messageRole === "customer-support" ? "Describe the customer’s issue, impact, known facts, unknowns, and requested outcome…" : "Ask a question or explain the next step…"} rows={compact ? 2 : 3} /><button type="submit" disabled={!!busy || !text.trim()} className="stage2-primary-button"><Send size={13} /> Send to team</button></form>
        <div className="stage2-agent-tools"><label className="stage2-approval-toggle"><input type="checkbox" checked={settings.approvalMode} disabled={!!busy} onChange={(event) => void act({ action: "approval-mode", enabled: event.target.checked })} /> Require approval for AI handoffs</label><div className="stage2-agent-row"><select aria-label="AI coworker" value={aiRole} onChange={(event) => setAiRole(event.target.value as RoleId)}>{roleIds.map((roleId) => <option key={roleId} value={roleId}>Ask {roleLabels[roleId]} AI</option>)}</select><input aria-label="AI draft request" value={aiRequest} maxLength={500} onChange={(event) => setAiRequest(event.target.value)} /><button type="button" disabled={!!busy || !aiRequest.trim()} onClick={() => void act({ action: "ai-draft", roleId: aiRole, request: aiRequest.trim() })}>Draft reply</button></div></div>
      </div>
    </div>
    {artifact && <dialog ref={artifactDialog} onClose={() => setArtifact(null)} className="stage2-modal" aria-label={artifact.title}><button type="button" className="stage2-modal-close" onClick={() => artifactDialog.current?.close()} aria-label="Close artifact"><X size={17} /></button><span className="stage2-kicker">{artifact.kind.toUpperCase()} · STUDENT ARTIFACT</span><h3>{artifact.title}</h3><pre>{artifact.body}</pre></dialog>}
    <DetailSheet open={Boolean(detailEvent)} title={detailEvent?.headline ?? "Company event"} onClose={() => setDetailEvent(null)}>{detailEvent && <><p className="library-eyebrow">{roleLabels[detailEvent.roleId].toUpperCase()} · EVENT {String(detailEvent.sequence).padStart(3, "0")}</p><p className="mt-4">{detailEvent.detail}</p><p className="mt-5 text-[#66816d]"><strong>Simulated outcome:</strong> {detailEvent.outcome}</p></>}</DetailSheet>
  </section>;
}

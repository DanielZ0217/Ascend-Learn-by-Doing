"use client";

import { use, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Command, RotateCcw, Sparkles } from "lucide-react";
import { companyBlueprintSchema, roleIds, type CompanyBlueprint, type RoleId } from "@/lib/contracts";
import { OfficeScene } from "@/components/company/office-scene";
import { CoworkerSelector } from "@/components/company/coworker-selector";
import { AppNavigation } from "@/components/company/app-navigation";
import { Stage2Panel } from "@/components/stage2/stage2-panel";

export default function CompanyPage({ params }: { params: Promise<{ companyId: string }> }) {
  const { companyId } = use(params);
  const router = useRouter();
  const [blueprint, setBlueprint] = useState<CompanyBlueprint | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [activeRole, setActiveRole] = useState<RoleId>("software-engineer");
  const [selectedRole, setSelectedRole] = useState<RoleId | null>(null);
  const [returnFromRole, setReturnFromRole] = useState<RoleId | null>(null);
  const [enteringRole, setEnteringRole] = useState(false);
  const [meetingProgress, setMeetingProgress] = useState(0);
  const [mode, setMode] = useState<"live" | "fixture">("fixture");
  const [reducedMotion, setReducedMotion] = useState(false);
  const [resetViewSignal, setResetViewSignal] = useState(0);
  const [orbitAngle, setOrbitAngle] = useState(43);
  const [restarting, setRestarting] = useState(false);
  const [restartError, setRestartError] = useState("");
  const [isOwner, setIsOwner] = useState(false);
  const navigationTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const restartDialog = useRef<HTMLDialogElement>(null);
  const restartButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      try {
        const raw = localStorage.getItem(`hacktx:company:${companyId}`);
        if (raw) setBlueprint(companyBlueprintSchema.parse(JSON.parse(raw)));
        setMode(localStorage.getItem(`hacktx:company-mode:${companyId}`) === "live" ? "live" : "fixture");
        setIsOwner(localStorage.getItem(`hacktx:owner:${companyId}`) === "true");
        const returning = sessionStorage.getItem(`hacktx:return-camera:${companyId}`);
        if (returning && roleIds.includes(returning as RoleId)) setReturnFromRole(returning as RoleId);
        sessionStorage.removeItem(`hacktx:return-camera:${companyId}`);
        setReducedMotion(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
      } catch { setBlueprint(null); }
      finally { setLoaded(true); }
    });
    return () => cancelAnimationFrame(frame);
  }, [companyId]);

  useEffect(() => () => { if (navigationTimer.current) clearTimeout(navigationTimer.current); }, []);
  useEffect(() => {
    const update = (event: Event) => {
      const detail = (event as CustomEvent<{ companyId: string; isOwner: boolean }>).detail;
      if (detail.companyId === companyId) setIsOwner(detail.isOwner);
    };
    window.addEventListener("hacktx:ownership", update);
    return () => window.removeEventListener("hacktx:ownership", update);
  }, [companyId]);

  useEffect(() => {
    if (!selectedRole || (selectedRole !== "sales-marketing" && selectedRole !== "customer-support")) return;
    if (reducedMotion) return;
    let frame = 0;
    const started = performance.now();
    const tick = (now: number) => { setMeetingProgress(Math.min(1, (now - started) / 2400)); if (now - started < 2400) frame = requestAnimationFrame(tick); };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [selectedRole, reducedMotion]);

  function selectRole(role: RoleId) {
    if (enteringRole) return;
    setActiveRole(role);
    setSelectedRole(role);
    setMeetingProgress(reducedMotion ? 1 : 0);
    router.prefetch(`/company/${encodeURIComponent(companyId)}/role/${role}`);
  }
  function enterRole() {
    if (!selectedRole || enteringRole) return;
    const destination = `/company/${encodeURIComponent(companyId)}/role/${selectedRole}`;
    sessionStorage.setItem(`hacktx:return-camera:${companyId}`, selectedRole);
    if (reducedMotion) { router.push(destination); return; }
    setEnteringRole(true);
    navigationTimer.current = setTimeout(() => router.push(destination), 760);
  }
  async function restart() {
    setRestarting(true); setRestartError("");
    try {
      const response = await fetch("/api/company/reset", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ companyId }) });
      const payload = await response.json() as { error?: { message?: string }; inviteToken?: string };
      if (!response.ok) throw new Error(payload.error?.message || "The company could not be restarted. Try again.");
      for (const key of Object.keys(localStorage)) if (key.startsWith("hacktx:") && key.includes(companyId) && ![`hacktx:company:${companyId}`, `hacktx:company-mode:${companyId}`, `hacktx:name:${companyId}`, `hacktx:owner:${companyId}`].includes(key)) localStorage.removeItem(key);
      if (payload.inviteToken) localStorage.setItem(`hacktx:invite:${companyId}`, payload.inviteToken);
      for (const key of Object.keys(sessionStorage)) if (key.startsWith("hacktx:") && key.includes(companyId)) sessionStorage.removeItem(key);
      restartDialog.current?.close();
      window.location.reload();
    } catch (error) {
      setRestartError(error instanceof Error ? error.message : "The company could not be restarted. Try again.");
      setRestarting(false);
    }
  }

  if (!loaded) return <main className="office-loading"><span className="loading-symbol"><Command size={30}/></span><p>Opening your workplace…</p></main>;
  if (!blueprint) return <main className="office-empty"><div className="office-empty-card"><span className="eyebrow-line">A FRESH START</span><h1>Your company isn’t here yet.</h1><p>Create a company first, then your five coworkers will be waiting in the office.</p><Link href="/" className="create-button">Create a company <ArrowRight size={18}/></Link></div></main>;
  const company = blueprint.company;
  const meeting = selectedRole === "sales-marketing" || selectedRole === "customer-support";

  return <main className="office-page">
    <AppNavigation location="office" companyId={companyId} companyName={company.name} actions={<><span className="office-status"><span className="live-pip"/>{mode === "live" ? "LIVE COMPANY" : "DEMO COMPANY"}</span>{isOwner && <button ref={restartButton} type="button" onClick={() => restartDialog.current?.showModal()} className="office-reset"><RotateCcw size={14}/>Restart demo</button>}</>} />
    <div className="office-main">
      {restartError && <p className="office-restart-error" role="alert">{restartError}</p>}
      <div className="office-title-row"><div><div className="eyebrow-line"><span className="eyebrow-spark"><Sparkles size={12}/></span> YOUR WORKPLACE IS READY</div><h1>Welcome to <em>{company.name}.</em></h1><p>{company.description}</p></div><div className="office-stats"><span><strong>05</strong><small>YOUR COWORKERS</small></span><span><strong>{String(company.employeeCount).padStart(2,"0")}</strong><small>TEAM MEMBERS</small></span></div></div>
      <div className="office-workspace">
        <section className="office-stage" aria-label="Interactive company scene"><div className="stage-top"><span><span className="stage-dot"/> THE WORKPLACE</span><span>DRAG TO ROTATE · SCROLL TO ZOOM <ArrowRight size={14}/></span></div><div className="stage-scene"><OfficeScene preset={company.preset} companyName={company.name} previewRole={activeRole} selectedRole={selectedRole} enteringRole={enteringRole} returnFromRole={returnFromRole} reducedMotion={reducedMotion} meetingProgress={meetingProgress} resetSignal={resetViewSignal} onOrbitAngleChange={setOrbitAngle} onPreviewRole={setActiveRole} onSelectRole={selectRole}/><div className="scene-grid" aria-hidden="true"/><span className="scene-touch-hint">DRAG TO SPIN 360° · PINCH TO ZOOM</span><button className="scene-reset-view" type="button" onPointerDown={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); setResetViewSignal((value) => value + 1); }}><RotateCcw size={14}/> Reset view</button></div><div className="stage-bottom"><span>01 / EXPLORE THE OFFICE · VIEW {orbitAngle}°</span><span>{meeting && meetingProgress < 1 ? "CUSTOMER ARRIVING…" : enteringRole ? "ENTERING YOUR ROLE…" : selectedRole ? "COWORKER SELECTED" : "FIVE PATHS, ONE COMPANY"}</span></div></section>
        <aside className="team-panel" aria-label="Choose a coworker"><div className="team-panel-heading"><div><span className="panel-eyebrow">THE PEOPLE BEHIND THE WORK</span><h2>Meet your team<span>.</span></h2></div><span className="team-count">05</span></div><div className="team-intro">Move through the team, then choose who you want to be today.</div>
          <CoworkerSelector profiles={blueprint.profiles} activeRole={activeRole} selectedRole={selectedRole} meetingProgress={meetingProgress} enteringRole={enteringRole} reducedMotion={reducedMotion} onPreview={setActiveRole} onSelect={selectRole} onEnter={enterRole}/>
        </aside>
      </div>
      <div className="office-bottomline"><span>ONE COMPANY. FIVE PERSPECTIVES. YOUR NEXT MOVE.</span><span>LEARN → TRY → IMPROVE</span></div>
      {company.participantMode && <Stage2Panel companyId={companyId} currentRole={activeRole} />}
    </div>
    <dialog ref={restartDialog} className="restart-dialog" aria-labelledby="restart-dialog-title" onClose={() => restartButton.current?.focus()}>
      <span className="library-eyebrow">RESTART DEMO</span><h2 id="restart-dialog-title">Start {company.name} fresh?</h2>
      <p>This clears the team assignment and every part, role tasks, chats, uploaded material, learner preferences, and the company simulation. Guests leave and the join code changes. The company and its settings stay.</p>
      {restartError && <p className="office-restart-error" role="alert">{restartError}</p>}
      <div className="restart-dialog-actions"><button type="button" disabled={restarting} onClick={() => restartDialog.current?.close()}>Keep this run</button><button type="button" disabled={restarting} onClick={() => void restart()}>{restarting ? "Restarting…" : "Restart demo"}</button></div>
    </dialog>
  </main>;
}

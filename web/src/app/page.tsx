"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Plus, Trash2 } from "lucide-react";
import { AppNavigation } from "@/components/company/app-navigation";
import { CompanyCreator } from "@/components/company/company-creator";
import { readSavedCompanies, type SavedCompany } from "@/lib/company/browser-library";

const labels: Record<SavedCompany["preset"], string> = {
  bank: "Neighborhood bank", restaurant: "Modern restaurant", software: "Software studio",
  semiconductor: "Chip company", custom: "Your own idea",
};

export default function Home() {
  const [companies, setCompanies] = useState<SavedCompany[] | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SavedCompany | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const deleteDialog = useRef<HTMLDialogElement>(null);
  const deleteButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    let active = true;
    const update = () => setCompanies(readSavedCompanies(localStorage));
    queueMicrotask(() => { if (active) update(); });
    window.addEventListener("pageshow", update);
    return () => { active = false; window.removeEventListener("pageshow", update); };
  }, []);

  async function deleteCompany() {
    if (!deleteTarget || deleting) return;
    setDeleting(true);
    setDeleteError("");
    try {
      const companyId = deleteTarget.id;
      if (localStorage.getItem(`hacktx:owner:${companyId}`) === "false") {
        void fetch("/api/stage2", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "leave", companyId }) });
        for (const key of Object.keys(localStorage)) if (key.startsWith("hacktx:") && key.includes(companyId)) localStorage.removeItem(key);
        if (localStorage.getItem("hacktx:active-company") === companyId) localStorage.removeItem("hacktx:active-company");
        for (const key of Object.keys(sessionStorage)) if (key.startsWith("hacktx:") && key.includes(companyId)) sessionStorage.removeItem(key);
        deleteDialog.current?.close();
        setCompanies(readSavedCompanies(localStorage));
        return;
      }
      const requestDelete = () => fetch("/api/company/restart", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ companyId }) });
      let response = await requestDelete();
      if (response.status === 401) {
        setReconnecting(true);
        response = await requestDelete();
        setReconnecting(false);
      }
      const payload = await response.json() as { error?: { message?: string } };
      if (!response.ok) throw new Error(payload.error?.message || "Could not delete this company. Try again.");
      for (const key of Object.keys(localStorage)) if (key.startsWith("hacktx:") && key.includes(deleteTarget.id)) localStorage.removeItem(key);
      if (localStorage.getItem("hacktx:active-company") === deleteTarget.id) localStorage.removeItem("hacktx:active-company");
      for (const key of Object.keys(sessionStorage)) if (key.startsWith("hacktx:") && key.includes(deleteTarget.id)) sessionStorage.removeItem(key);
      deleteDialog.current?.close();
      setCompanies(readSavedCompanies(localStorage));
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : "Could not delete this company. Try again.");
    } finally { setDeleting(false); setReconnecting(false); }
  }

  if (companies === null) return <main className="company-home-loading" aria-live="polite">Opening Ascend…</main>;
  if (companies.length === 0) return <CompanyCreator />;
  const activeCompany = companies.find((company) => company.id === localStorage.getItem("hacktx:active-company"));

  return <main className="company-library-page">
    <AppNavigation location="companies" companyId={activeCompany?.id} companyName={activeCompany?.name} />
    <div className="company-library-main">
      <div className="company-library-intro"><div><span className="library-eyebrow">YOUR WORKPLACES · SAVED IN THIS BROWSER</span><h1>Your companies<span>.</span></h1><p>Step back into a workplace, or build a new one to explore another kind of work.</p></div><Link href="/new" className="library-create"><Plus size={18} /> Create a company</Link></div>
      <div className="company-library-grid">{companies.map((company) => <article className="company-library-card" key={company.id}>
        <div className="company-library-image"><Image src={`/company/office-${company.preset}.webp`} alt={`Illustrated ${labels[company.preset].toLowerCase()} floor plan`} fill sizes="(max-width: 720px) 100vw, (max-width: 1100px) 50vw, 33vw" /></div>
        <div className="company-library-card-body"><span className="company-library-type">{labels[company.preset]} · {company.experienceMode === "real-world" ? "Real world" : "Practice"}</span><h2>{company.name}</h2><p>{company.description}</p><div className="company-library-card-foot"><span>{company.companyStage === "mature" ? "Mature company" : "Startup"} · {company.participantMode === "collaborative" ? "Up to 5 students" : "Just me"}</span><div className="company-library-card-actions"><button type="button" aria-label={`${localStorage.getItem(`hacktx:owner:${company.id}`) === "false" ? "Leave" : "Delete"} ${company.name}`} onClick={(event) => { deleteButton.current = event.currentTarget; setDeleteTarget(company); setDeleteError(""); deleteDialog.current?.showModal(); }}><Trash2 size={14} /> {localStorage.getItem(`hacktx:owner:${company.id}`) === "false" ? "Leave" : "Delete"}</button><Link href={`/company/${encodeURIComponent(company.id)}`} onClick={() => localStorage.setItem("hacktx:active-company", company.id)}>Open <ArrowRight size={16} /></Link></div></div></div>
      </article>)}</div>
      <p className="company-library-note">These companies are saved in this browser. A teammate joins with the code shown in the creator’s company workspace. <Link href="/join">Join a company</Link></p>
    </div>
    <dialog ref={deleteDialog} className="restart-dialog" aria-labelledby="library-delete-title" onClose={() => { setDeleteTarget(null); deleteButton.current?.focus(); }}>
      <span className="library-eyebrow">{deleteTarget && localStorage.getItem(`hacktx:owner:${deleteTarget.id}`) === "false" ? "LEAVE COMPANY" : "DELETE COMPANY"}</span><h2 id="library-delete-title">{deleteTarget && localStorage.getItem(`hacktx:owner:${deleteTarget.id}`) === "false" ? "Leave" : "Delete"} {deleteTarget?.name}?</h2>
      <p>{deleteTarget && localStorage.getItem(`hacktx:owner:${deleteTarget.id}`) === "false" ? "This removes the company shortcut from this browser. The creator and other students keep the company." : "This removes this company, its uploads, team conversation, and shared simulation for everyone in it. Your other companies remain."}</p>
      {deleteError && <p className="office-restart-error" role="alert">{deleteError}</p>}
      <div className="restart-dialog-actions"><button type="button" disabled={deleting} onClick={() => deleteDialog.current?.close()}>Keep company</button><button type="button" disabled={deleting} onClick={() => void deleteCompany()}>{reconnecting ? "Reconnecting…" : deleting ? "Working…" : deleteTarget && localStorage.getItem(`hacktx:owner:${deleteTarget.id}`) === "false" ? "Leave company" : "Delete this company"}</button></div>
    </dialog>
  </main>;
}

"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ArrowLeft, ArrowRight, Check, ChevronDown } from "lucide-react";
import { companyBlueprintSchema } from "@/lib/contracts";
import { AppNavigation } from "./app-navigation";
import { JoinCompanyForm } from "./join-company-form";

type Preset = "bank" | "restaurant" | "software" | "semiconductor" | "custom";
const presets: { id: Preset; label: string; name: string; description: string; prompt: string }[] = [
  { id: "bank", label: "Neighborhood bank", name: "Northstar Bank", description: "Help people feel at home with their money.", prompt: "Create a customer-first digital bank that helps young professionals manage everyday finances. Give the five coworkers realistic work and customer problems." },
  { id: "restaurant", label: "Modern restaurant", name: "Sora Table", description: "Bring neighbors together around good food.", prompt: "Create a busy neighborhood restaurant with online ordering, regular guests, and a small operations team. Give the five coworkers realistic work and customer problems." },
  { id: "software", label: "Software studio", name: "Aperture", description: "Turn hard workflows into simple products.", prompt: "Create a B2B software company with a useful product, real customers, and a growing team. Give the five coworkers realistic work and customer problems." },
  { id: "semiconductor", label: "Chip company", name: "Mesa Micro", description: "Balance chip quality, delivery, and customer trust.", prompt: "Create a semiconductor company making sensor chips for device makers. Include traceability, production quality, and realistic customer requests." },
  { id: "custom", label: "Your own idea", name: "", description: "Shape a company around an idea of your own.", prompt: "" },
];

export function CompanyCreator() {
  const router = useRouter();
  const [presetIndex, setPresetIndex] = useState(0);
  const [name, setName] = useState(presets[0].name);
  const [prompt, setPrompt] = useState(presets[0].prompt);
  const [employeeCount, setEmployeeCount] = useState(28);
  const [customerCount, setCustomerCount] = useState(1200);
  const [participantMode, setParticipantMode] = useState<"single" | "collaborative">("single");
  const [experienceMode, setExperienceMode] = useState<"practice" | "real-world">("practice");
  const [companyStage, setCompanyStage] = useState<"startup" | "mature">("startup");
  const [creatorName, setCreatorName] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [paused, setPaused] = useState(false);
  const [interacted, setInteracted] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const touchStart = useRef<number | null>(null);
  const drafts = useRef(Object.fromEntries(presets.map((preset) => [preset.id, { name: preset.name, prompt: preset.prompt }])) as Record<Preset, { name: string; prompt: string }>);
  const selected = presets[presetIndex];

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(query.matches);
    update(); query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (paused || interacted || creating || reducedMotion) return;
    const timer = window.setTimeout(() => select((presetIndex + 1) % presets.length, false), 7000);
    return () => window.clearTimeout(timer);
  }, [presetIndex, paused, interacted, creating, reducedMotion]);

  function select(index: number, manual = true) {
    const next = (index + presets.length) % presets.length;
    setPresetIndex(next); setName(drafts.current[presets[next].id].name); setPrompt(drafts.current[presets[next].id].prompt);
    setShowAdvanced(presets[next].id === "custom"); setError("");
    if (manual) setInteracted(true);
  }

  async function createCompany(mode?: "fixture") {
    if (!name.trim() || !prompt.trim() || (participantMode === "collaborative" && !creatorName.trim())) {
      if (!prompt.trim()) setShowAdvanced(true);
      setError("Add a company name, an idea, and your name for collaboration."); return;
    }
    setCreating(true); setError("");
    try {
      const response = await fetch("/api/company", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ preset: selected.id, companyName: name.trim(), prompt: prompt.trim(), employeeCount, customerCount, mode,
        stage2: true, participantMode, experienceMode, companyStage, creatorName: creatorName.trim() || "You" }) });
      const payload: unknown = await response.json();
      if (!response.ok) {
        const issue = typeof payload === "object" && payload !== null && "error" in payload ? payload.error : null;
        const code = typeof issue === "object" && issue !== null && "code" in issue ? String(issue.code) : "";
        const message = typeof issue === "object" && issue !== null && "message" in issue ? String(issue.message) : "";
        throw new Error(code === "provider_timeout" ? "The AI supervisor timed out. Retry or use a labeled demo company." : message || "The company could not be created. Please try again.");
      }
      const blueprint = companyBlueprintSchema.parse((payload as { blueprint: unknown }).blueprint);
      localStorage.setItem(`hacktx:company:${blueprint.company.id}`, JSON.stringify(blueprint));
      localStorage.setItem("hacktx:active-company", blueprint.company.id);
      localStorage.setItem(`hacktx:company-mode:${blueprint.company.id}`, (payload as { mode?: string }).mode === "live" ? "live" : "fixture");
      const shared = (payload as { stage2?: { inviteToken?: string } }).stage2;
      if (shared?.inviteToken) localStorage.setItem(`hacktx:invite:${blueprint.company.id}`, shared.inviteToken);
      localStorage.setItem(`hacktx:owner:${blueprint.company.id}`, "true");
      localStorage.setItem(`hacktx:name:${blueprint.company.id}`, creatorName.trim() || "You");
      router.push(`/company/${encodeURIComponent(blueprint.company.id)}`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "The company could not be created. Please try again."); }
    finally { setCreating(false); }
  }

  return <main className="company-create-page" onPointerDown={() => setInteracted(true)} onFocusCapture={() => setInteracted(true)}>
    <AppNavigation location="create" />
    <div className="company-create-main">
      <div className="company-create-intro"><span className="library-eyebrow">CHOOSE A WORLD TO WORK IN</span><h1>Build a company.<br /><em>Learn by doing.</em></h1><p>Meet five AI coworkers, practice real work, and improve with every attempt.</p></div>
      <section className="company-carousel" aria-label="Company types" onPointerEnter={() => setPaused(true)} onPointerLeave={() => setPaused(false)} onFocusCapture={() => setPaused(true)} onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false); }} onKeyDown={(event) => { if (event.key === "ArrowLeft" || event.key === "ArrowRight") { event.preventDefault(); select(presetIndex + (event.key === "ArrowRight" ? 1 : -1)); } }} onTouchStart={(event) => { touchStart.current = event.touches[0]?.clientX ?? null; setPaused(true); }} onTouchEnd={(event) => { if (touchStart.current === null) return; const distance = (event.changedTouches[0]?.clientX ?? touchStart.current) - touchStart.current; if (Math.abs(distance) > 45) select(presetIndex + (distance < 0 ? 1 : -1)); touchStart.current = null; }}>
        <button type="button" className="carousel-arrow carousel-arrow-left" onClick={() => select(presetIndex - 1)} aria-label="Previous company type"><ArrowLeft size={20} /></button>
        <div className="carousel-track">{presets.map((option, index) => {
          const delta = (index - presetIndex + presets.length) % presets.length;
          const position = delta === 0 ? "active" : delta === 1 ? "next" : delta === presets.length - 1 ? "previous" : "hidden";
          return <button type="button" key={option.id} className={`carousel-card ${position}`} aria-hidden={position === "hidden"} tabIndex={position === "hidden" ? -1 : 0} aria-pressed={index === presetIndex} aria-label={option.label} onClick={() => select(index)}><Image src={`/company/office-${option.id}.webp`} alt="" fill sizes="(max-width: 680px) 82vw, 650px" priority={index === 0} /><span className="carousel-card-label">{option.label}</span></button>;
        })}</div>
        <button type="button" className="carousel-arrow carousel-arrow-right" onClick={() => select(presetIndex + 1)} aria-label="Next company type"><ArrowRight size={20} /></button>
        <div className="carousel-count" role="status" aria-live="polite">{String(presetIndex + 1).padStart(2, "0")} / 05 · {selected.label}</div>
      </section>
      <form className="creation-form company-create-form" onSubmit={(event) => { event.preventDefault(); void createCompany(); }}>
        <div className="company-create-selected"><div><span className="library-eyebrow">YOUR STARTING POINT</span><h2>{selected.id === "custom" ? name.trim() || "Your own idea" : selected.label}</h2><p>{selected.id === "custom" && prompt.trim() ? prompt.trim().slice(0, 150) : selected.description}</p></div><span className="company-create-selected-mark"><Check size={18} /></span></div>
        <div className="field-pair"><label className="field-label">Company name<input value={name} onChange={(event) => { drafts.current[selected.id].name = event.target.value; setName(event.target.value); }} maxLength={80} placeholder="Name your company" required /></label></div>
        <div className="stage2-setup" aria-label="Company experience settings">
          <div className="stage2-choice"><div><strong>Who is joining?</strong><small>Invite up to four teammates or work solo.</small></div><div className="stage2-segments" role="group" aria-label="Participants"><button type="button" aria-pressed={participantMode === "single"} onClick={() => setParticipantMode("single")}>Just me</button><button type="button" aria-pressed={participantMode === "collaborative"} onClick={() => setParticipantMode("collaborative")}>Up to 5 students</button></div></div>
          <div className="stage2-choice"><div><strong>How do you want to learn?</strong><small>Practice or follow a living company.</small></div><div className="stage2-segments" role="group" aria-label="Experience"><button type="button" aria-pressed={experienceMode === "practice"} onClick={() => setExperienceMode("practice")}>Practice</button><button type="button" aria-pressed={experienceMode === "real-world"} onClick={() => setExperienceMode("real-world")}>Real world</button></div></div>
          <div className="stage2-choice"><div><strong>Company stage</strong><small>Changes the pace and constraints.</small></div><div className="stage2-segments" role="group" aria-label="Company stage"><button type="button" aria-pressed={companyStage === "startup"} onClick={() => setCompanyStage("startup")}>Startup</button><button type="button" aria-pressed={companyStage === "mature"} onClick={() => setCompanyStage("mature")}>Mature</button></div></div>
          {participantMode === "collaborative" && <label className="stage2-name">Your name<input value={creatorName} onChange={(event) => setCreatorName(event.target.value)} maxLength={40} placeholder="Name shown in the team conversation" required /></label>}
        </div>
        <button className="advanced-trigger" type="button" aria-expanded={showAdvanced} onClick={() => setShowAdvanced(!showAdvanced)}><span>Company details <small>Edit the brief and size</small></span><ChevronDown className={showAdvanced ? "turned" : ""} size={18} /></button>
        {showAdvanced && <div className="advanced-fields"><label className="field-label advanced-idea">Your idea<span className="field-hint">Tell the supervisor what to build</span><textarea value={prompt} onChange={(event) => { drafts.current[selected.id].prompt = event.target.value; setPrompt(event.target.value); }} maxLength={1000} rows={3} placeholder="What does your company do? Who does it serve?" required /></label><label>Employees<input type="number" min={5} max={100000} value={employeeCount} onChange={(event) => setEmployeeCount(Number(event.target.value))} /></label><label>Customers<input type="number" min={1} max={10000000} value={customerCount} onChange={(event) => setCustomerCount(Number(event.target.value))} /></label></div>}
        {error && <div className="creation-error" role="alert"><p>{error}</p><button type="button" disabled={creating} onClick={() => void createCompany("fixture")}>Use demo company <ArrowRight size={14} /></button></div>}
        <button type="submit" className="create-button" disabled={creating}>{creating ? "Building your company…" : "Enter your company"}<ArrowRight size={19} /></button>
      </form>
      <p className="company-create-note">Illustrated previews show the character of each company. Your office becomes interactive when you enter.</p>
      <div className="mx-auto mt-12 max-w-2xl"><JoinCompanyForm /></div>
    </div>
  </main>;
}

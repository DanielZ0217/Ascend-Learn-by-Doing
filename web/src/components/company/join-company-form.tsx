"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { companyBlueprintSchema } from "@/lib/contracts";

export function JoinCompanyForm() {
  const router = useRouter();
  const [joinCode, setJoinCode] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function join(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/stage2/join", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ joinCode: joinCode.trim().toUpperCase(), displayName: displayName.trim() }) });
      const payload = await response.json() as { blueprint?: unknown; isOwner?: boolean; settings?: { generationMode?: string }; error?: { message?: string } };
      if (!response.ok) throw new Error(payload.error?.message || "Could not join this company.");
      const blueprint = companyBlueprintSchema.parse(payload.blueprint);
      const companyId = blueprint.company.id;
      localStorage.setItem(`hacktx:company:${companyId}`, JSON.stringify(blueprint));
      localStorage.setItem(`hacktx:company-mode:${companyId}`, payload.settings?.generationMode === "fixture" ? "fixture" : "live");
      localStorage.setItem(`hacktx:join-code:${companyId}`, joinCode.trim().toUpperCase());
      localStorage.setItem(`hacktx:name:${companyId}`, displayName.trim());
      localStorage.setItem(`hacktx:owner:${companyId}`, payload.isOwner ? "true" : "false");
      localStorage.setItem("hacktx:active-company", companyId);
      router.push(`/company/${encodeURIComponent(companyId)}`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not join this company."); }
    finally { setBusy(false); }
  }

  return <form onSubmit={(event) => void join(event)} className="rounded-[26px] border border-[#dce6d9] bg-white p-6 shadow-sm sm:p-8">
    <span className="library-eyebrow">JOIN A TEAMMATE</span>
    <h2 className="mt-2 text-2xl font-semibold text-[#253e30]">Have a company code?</h2>
    <p className="mt-2 text-sm text-[#65796a]">Ask the creator for the eight-character code shown in their company workspace. Enter your name so the team knows who joined.</p>
    <div className="mt-5 grid gap-3 sm:grid-cols-2">
      <label className="text-sm font-semibold text-[#496451]">Company code<input aria-label="Company code" value={joinCode} onChange={(event) => setJoinCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8))} minLength={8} maxLength={8} required autoComplete="off" placeholder="ABCD2345" className="mt-2 block w-full rounded-xl border border-[#cadaca] px-4 py-3 font-mono tracking-[0.16em] outline-none focus:border-[#5c9268]" /></label>
      <label className="text-sm font-semibold text-[#496451]">Name for the team<input aria-label="Name for the team" value={displayName} onChange={(event) => setDisplayName(event.target.value.slice(0, 40))} maxLength={40} required placeholder="Name shown to the team" className="mt-2 block w-full rounded-xl border border-[#cadaca] px-4 py-3 outline-none focus:border-[#5c9268]" /></label>
    </div>
    {error && <p className="mt-3 text-sm text-[#a94c3b]" role="alert">{error}</p>}
    <button type="submit" disabled={busy || joinCode.length !== 8 || !displayName.trim()} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#285841] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Joining…" : "Join company"} <ArrowRight size={16} /></button>
  </form>;
}

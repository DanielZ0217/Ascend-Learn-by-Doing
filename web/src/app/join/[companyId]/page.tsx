"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, UsersRound } from "lucide-react";
import { companyBlueprintSchema } from "@/lib/contracts";

export default function JoinCompany({ params }: { params: Promise<{ companyId: string }> }) {
  const { companyId } = use(params);
  const router = useRouter();
  const [inviteToken, setInviteToken] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const frame = requestAnimationFrame(() => setInviteToken(new URLSearchParams(window.location.search).get("invite") ?? ""));
    return () => cancelAnimationFrame(frame);
  }, []);

  async function join() {
    if (!name.trim() || !inviteToken) return;
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/stage2/join", { method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ companyId, inviteToken, displayName: name.trim() }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error?.message ?? "The invitation could not be opened.");
      const blueprint = companyBlueprintSchema.parse(payload.blueprint);
      localStorage.setItem(`hacktx:company:${companyId}`, JSON.stringify(blueprint));
      localStorage.setItem(`hacktx:invite:${companyId}`, inviteToken);
      localStorage.setItem(`hacktx:owner:${companyId}`, "false");
      localStorage.setItem(`hacktx:name:${companyId}`, name.trim());
      localStorage.setItem(`hacktx:company-mode:${companyId}`, payload.settings?.generationMode === "fixture" ? "fixture" : "live");
      localStorage.setItem("hacktx:active-company", companyId);
      router.replace(`/company/${encodeURIComponent(companyId)}`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "The invitation could not be opened."); }
    finally { setBusy(false); }
  }

  return <main className="grid min-h-screen place-items-center bg-[#f4f4ef] px-5 text-[#284333]">
    <div className="w-full max-w-md rounded-[24px] border border-[#dde5d9] bg-[#fffdfa] p-8 shadow-[0_18px_55px_#253a2a12]">
      <div className="flex items-center gap-3"><span className="grid size-11 place-items-center rounded-xl bg-[#e4efe3] text-[#356849]"><UsersRound size={20} /></span><span className="text-xs font-bold uppercase tracking-[.16em] text-[#728c76]">Shared workplace</span></div>
      <h1 className="mt-6 text-[29px] font-semibold tracking-[-.05em]">Join the company</h1>
      <p className="mt-2 text-sm leading-6 text-[#6b7c6c]">Your team invited you into the same workplace. Your name will appear on shared messages; private coaching stays yours.</p>
      <form className="mt-7" onSubmit={(event) => { event.preventDefault(); void join(); }}>
        <label className="block text-xs font-bold text-[#42614a]">Your name<input className="mt-2 block w-full rounded-xl border border-[#d9e3d7] bg-white px-4 py-3 text-sm outline-none focus:border-[#64936d] focus:ring-2 focus:ring-[#e4efe3]" value={name} onChange={(event) => setName(event.target.value)} placeholder="Name shown to your teammate" maxLength={40} required /></label>
        {!inviteToken && <p className="mt-4 text-xs text-[#9e6049]">This link is missing its invitation token. Ask your teammate to copy the full link.</p>}
        {error && <p className="mt-4 text-xs text-[#9e6049]" role="alert">{error}</p>}
        <button type="submit" disabled={busy || !inviteToken} className="mt-6 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#295a41] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Joining…" : "Enter workplace"}<ArrowRight size={17} /></button>
      </form>
      <Link href="/" className="mt-5 inline-block text-xs text-[#78907b] hover:text-[#345f47]">Create a different company</Link>
    </div>
  </main>;
}

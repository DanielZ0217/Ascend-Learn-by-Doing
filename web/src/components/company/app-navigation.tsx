"use client";

import { useEffect, useRef, type ReactNode } from "react";
import Link from "next/link";
import { Command, Menu, X } from "lucide-react";

type Location = "companies" | "create" | "join" | "office" | "role";

export function AppNavigation({ location, companyId, companyName, actions }: {
  location: Location; companyId?: string; companyName?: string; actions?: ReactNode;
}) {
  const drawer = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const node = drawer.current;
    if (!node) return;
    const close = () => { document.body.style.overflow = ""; trigger.current?.focus(); };
    node.addEventListener("close", close);
    return () => { node.removeEventListener("close", close); document.body.style.overflow = ""; };
  }, []);

  function openMenu() {
    drawer.current?.showModal();
    document.body.style.overflow = "hidden";
  }

  const officeHref = companyId ? `/company/${encodeURIComponent(companyId)}` : "/";
  return <header className="site-nav">
    <Link className="brand-lockup" href="/" aria-label="Ascend — My companies"><span className="brand-mark"><Command size={20} strokeWidth={2.5} /></span><span>Ascend</span></Link>
    <nav className="site-nav-links" aria-label="Main navigation">
      <Link href="/" aria-current={location === "companies" ? "page" : undefined}>My companies</Link>
      <Link href="/new" aria-current={location === "create" ? "page" : undefined}>Create a company</Link>
      <Link href="/join" aria-current={location === "join" ? "page" : undefined}>Join a company</Link>
      {companyId && <Link href={officeHref} aria-current={location === "office" ? "page" : undefined}>{companyName || "Current company"}</Link>}
    </nav>
    <div className="site-nav-actions">{actions}</div>
    <button ref={trigger} type="button" className="site-menu-trigger" onClick={openMenu} aria-label="Open menu"><Menu size={19} /> Menu</button>
    <dialog ref={drawer} className="site-menu-dialog" aria-label="Main menu" onClick={(event) => { if (event.target === drawer.current) drawer.current?.close(); }}>
      <div className="site-menu-panel">
        <div className="site-menu-heading"><strong>Go to</strong><button type="button" onClick={() => drawer.current?.close()} aria-label="Close menu"><X size={20} /></button></div>
        <nav aria-label="Mobile navigation">
          <Link href="/" onClick={() => drawer.current?.close()} aria-current={location === "companies" ? "page" : undefined}>My companies</Link>
          <Link href="/new" onClick={() => drawer.current?.close()} aria-current={location === "create" ? "page" : undefined}>Create a company</Link>
          <Link href="/join" onClick={() => drawer.current?.close()} aria-current={location === "join" ? "page" : undefined}>Join a company</Link>
          {companyId && <Link href={officeHref} onClick={() => drawer.current?.close()} aria-current={location === "office" ? "page" : undefined}>{companyName || "Current company"}</Link>}
        </nav>
      </div>
    </dialog>
  </header>;
}

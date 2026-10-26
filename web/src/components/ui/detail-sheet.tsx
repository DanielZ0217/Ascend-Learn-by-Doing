"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

export function DetailSheet({ open, title, onClose, children }: { open: boolean; title: string; onClose: () => void; children: ReactNode }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<Element | null>(null);

  useEffect(() => {
    const node = dialog.current;
    if (!node) return;
    if (open && !node.open) { opener.current = document.activeElement; node.showModal(); }
    if (!open && node.open) node.close();
  }, [open]);

  return <dialog ref={dialog} className="detail-sheet" aria-label={title} onClose={() => { onClose(); if (opener.current instanceof HTMLElement) opener.current.focus(); }} onClick={(event) => { if (event.target === dialog.current) dialog.current?.close(); }}>
    <div className="detail-sheet-head"><h2>{title}</h2><button type="button" onClick={() => dialog.current?.close()} aria-label="Close details"><X size={19} /></button></div>
    <div className="detail-sheet-body">{children}</div>
  </dialog>;
}

"use client";

import QRCode from "qrcode";
import { useEffect, useState } from "react";

/** Etherscan-style QR button that opens the address as a scannable code. */
export function QrButton({ value }: { value: string }) {
  const [open, setOpen] = useState(false);
  const [svg, setSvg] = useState<string | null>(null);

  useEffect(() => {
    if (!open || svg) return;
    QRCode.toString(value, { type: "svg", margin: 1, width: 240, color: { dark: "#212529", light: "#ffffff" } }).then(setSvg);
  }, [open, svg, value]);

  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Show QR code"
        className="grid size-7 place-items-center rounded-md border border-border bg-surface text-muted hover:text-link"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <path d="M14 14h3v3h-3zM20 14v.01M14 20h.01M17 20h4v-3" />
        </svg>
      </button>
      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onClick={() => setOpen(false)} role="dialog" aria-modal="true" aria-label="Address QR code">
          <div className="w-full max-w-xs rounded-xl border border-border bg-surface p-5 text-center shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <p className="mb-3 text-sm font-medium">Address QR Code</p>
            <div className="mx-auto w-60 overflow-hidden rounded-lg bg-white" dangerouslySetInnerHTML={svg ? { __html: svg } : undefined} />
            <p className="mt-3 break-all font-mono text-xs text-muted">{value}</p>
            <button type="button" onClick={() => setOpen(false)} className="mt-4 rounded-md bg-link px-4 py-1.5 text-sm text-white hover:bg-link-hover">
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}

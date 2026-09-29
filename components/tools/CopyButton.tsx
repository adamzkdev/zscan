"use client";

import { useState } from "react";

export function CopyButton({ text, label }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      title="Copy"
      aria-label="Copy"
      onClick={() => {
        navigator.clipboard?.writeText(text).then(() => {
          setDone(true);
          setTimeout(() => setDone(false), 1200);
        });
      }}
      className="inline-flex shrink-0 items-center gap-1 rounded-md border border-border bg-surface-2 px-1.5 py-1 text-xs text-muted hover:text-text"
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        {done ? <path d="m5 12 5 5 9-10" /> : <path d="M9 9h10v10H9zM5 15V5h10" />}
      </svg>
      {label}
    </button>
  );
}

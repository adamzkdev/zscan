"use client";

import Link from "next/link";
import { useState } from "react";
import { short } from "@/lib/format";

export function Hash({
  value,
  href,
  full = false,
  head,
  tail,
}: {
  value: string;
  href?: string;
  full?: boolean;
  head?: number;
  tail?: number;
}) {
  const text = full ? value : short(value, head, tail);
  const inner = <span className="font-mono">{text}</span>;
  return (
    <span className={`inline-flex min-w-0 items-center gap-1.5 ${full ? "break-all" : ""}`}>
      {href ? (
        <Link href={href} className="text-link hover:text-link-hover" title={value}>
          {inner}
        </Link>
      ) : (
        <span title={value}>{inner}</span>
      )}
      <CopyButton value={value} />
    </span>
  );
}

export function CopyButton({ value }: { value: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      aria-label="Copy"
      onClick={() => {
        navigator.clipboard?.writeText(value);
        setDone(true);
        setTimeout(() => setDone(false), 1200);
      }}
      className="shrink-0 rounded p-0.5 text-faint hover:text-text"
    >
      {done ? (
        <svg width="13" height="13" viewBox="0 0 24 24" aria-hidden>
          <path d="m5 12 5 5L20 7" fill="none" stroke="var(--good)" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      ) : (
        <svg width="13" height="13" viewBox="0 0 24 24" aria-hidden>
          <rect x="9" y="9" width="11" height="11" rx="2" fill="none" stroke="currentColor" strokeWidth="2" />
          <path d="M5 15V6a2 2 0 0 1 2-2h8" fill="none" stroke="currentColor" strokeWidth="2" />
        </svg>
      )}
    </button>
  );
}

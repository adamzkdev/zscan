"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/** Styled replacement for <select>, with keyboard support. */
export function Dropdown<T extends string>({
  value,
  options,
  onChange,
  label,
  className = "",
}: {
  value: T;
  options: { value: T; label: ReactNode }[];
  onChange: (v: T) => void;
  label: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = options.find((o) => o.value === value) ?? options[0];

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={label}
        onClick={() => setOpen((o) => !o)}
        className="flex h-full items-center gap-2 whitespace-nowrap rounded-md border border-border bg-surface-2 px-3 py-2 text-sm text-text hover:border-border-strong"
      >
        {current.label}
        <svg width="10" height="10" viewBox="0 0 24 24" className={`transition-transform ${open ? "rotate-180" : ""}`} aria-hidden>
          <path d="m6 9 6 6 6-6" fill="none" stroke="currentColor" strokeWidth="3" />
        </svg>
      </button>
      {open && (
        <ul role="listbox" className="absolute left-0 z-50 mt-1 min-w-full overflow-hidden rounded-lg border border-border bg-surface py-1 shadow-lg">
          {options.map((o) => (
            <li key={o.value}>
              <button
                type="button"
                role="option"
                aria-selected={o.value === value}
                onClick={() => {
                  onChange(o.value);
                  setOpen(false);
                }}
                className={`flex w-full items-center whitespace-nowrap px-3 py-1.5 text-left text-sm hover:bg-surface-2 ${
                  o.value === value ? "text-link" : "text-text"
                }`}
              >
                {o.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

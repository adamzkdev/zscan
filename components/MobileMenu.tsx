"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Logo } from "./Logo";
import { NAV } from "@/lib/nav";
import { Search } from "./Search";

export function MobileMenu() {
  const [open, setOpen] = useState(false);
  const path = usePathname();
  const [openedAt, setOpenedAt] = useState(path);

  // Close after navigating.
  if (open && path !== openedAt) {
    setOpen(false);
  }

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <div className="ml-auto lg:hidden">
      <button
        type="button"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        onClick={() => {
          setOpenedAt(path);
          setOpen((o) => !o);
        }}
        className="grid size-9 place-items-center rounded-lg border border-border text-text"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
          {open ? <path d="M6 6l12 12M18 6 6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
        </svg>
      </button>
      {open &&
        // Portal: the header's backdrop-filter would otherwise trap this fixed panel.
        createPortal(
        <div className="fixed inset-0 z-[60] overflow-y-auto bg-surface px-4 pb-10 pt-3">
          <div className="mb-4 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 font-semibold">
              <Logo size={28} />
              <span className="text-lg">
                Z<span className="text-accent">Scan</span>
              </span>
            </Link>
            <button
              type="button"
              aria-label="Close menu"
              onClick={() => setOpen(false)}
              className="grid size-9 place-items-center rounded-lg border border-border text-text"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                <path d="M6 6l12 12M18 6 6 18" />
              </svg>
            </button>
          </div>
          <Search />
          <nav className="mt-4 divide-y divide-border">
            {NAV.map((m) =>
              m.href ? (
                <Link key={m.label} href={m.href} className="block py-3 font-medium text-text">
                  {m.label}
                </Link>
              ) : (
                <details key={m.label} className="group py-1">
                  <summary className="flex list-none items-center justify-between py-2 font-medium text-text">
                    {m.label}
                    <svg width="12" height="12" viewBox="0 0 24 24" className="transition-transform group-open:rotate-180" aria-hidden>
                      <path d="m6 9 6 6 6-6" fill="none" stroke="currentColor" strokeWidth="3" />
                    </svg>
                  </summary>
                  <ul className="pb-2">
                    {m.items!.map((i) => (
                      <li key={i.href}>
                        <a href={i.href} className="block rounded-md px-3 py-2 text-sm text-muted hover:bg-surface-2 hover:text-link">
                          {i.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                </details>
              ),
            )}
          </nav>
        </div>,
        document.body,
      )}
    </div>
  );
}

import Link from "next/link";
import { AI_URL, STATS_URL } from "@/lib/nav";
import { Logo } from "./Logo";

const LINKS: [string, string][] = [
  [STATS_URL, "Stats"],
  [AI_URL, "Ask AI"],
  ["/developers", "API"],
  ["/status", "Status"],
  ["/brand", "Media Kit"],
  ["/privacy", "Privacy"],
];

export function Footer() {
  return (
    <footer className="mt-12 border-t border-border bg-surface">
      <div className="mx-auto max-w-[1400px] px-4">
        <div className="flex flex-col gap-4 py-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 font-semibold">
              <Logo size={24} />
              <span className="text-lg">
                Z<span className="text-accent">Scan</span>
              </span>
            </Link>
            <span className="text-sm text-muted">Open Zcash explorer. No trackers, no ads.</span>
          </div>
          <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
            {LINKS.filter(([href]) => href).map(([href, label]) => (
              <li key={label}>
                <a href={href} className="text-muted hover:text-link">
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </div>
        <div className="flex items-center justify-between border-t border-border py-4 text-xs text-muted">
          <span>ZScan © 2026 · Built for the Zcash community</span>
          <a href="#" className="hover:text-link">
            ↑ Back to top
          </a>
        </div>
      </div>
    </footer>
  );
}

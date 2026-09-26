import Link from "next/link";
import { Logo } from "./Logo";

const COLUMNS: { title: string; links: [string, string][] }[] = [
  {
    title: "Explore",
    links: [
      ["/blocks", "Blocks"],
      ["/txs", "Transactions"],
      ["/mempool", "Pending Transactions"],
      ["/accounts", "Top Accounts"],
      ["/labels", "Address Labels"],
    ],
  },
  {
    title: "Shielded",
    links: [
      ["/ironwood", "Ironwood Tracker"],
      ["/txs?kind=migration", "Migrations"],
      ["/txs?kind=shielded", "Shielded Transactions"],
      ["/privacy-stats", "Anonymity Sets"],
    ],
  },
  {
    title: "Analytics",
    links: [
      ["/protocols", "Protocols"],
      ["/supply", "Supply & Issuance"],
      ["/treasury", "Treasury"],
      ["/fees", "Fee Tracker"],
      ["/network", "Network Stats"],
      ["/upgrades", "Network Upgrades"],
    ],
  },
  {
    title: "Resources",
    links: [
      ["/developers", "API Documentation"],
      ["/brand", "Media Kit"],
      ["/status", "Status"],
      ["/privacy", "Privacy Policy"],
    ],
  },
];

export function Footer() {
  return (
    <footer className="mt-12 border-t border-border bg-surface">
      <div className="mx-auto max-w-[1400px] px-4">
        <div className="grid gap-8 py-8 sm:grid-cols-2 md:grid-cols-[1.5fr_repeat(4,1fr)]">
          <div>
            <Link href="/" className="flex items-center gap-2 font-semibold">
              <Logo size={26} />
              <span className="text-lg">
                Z<span className="text-accent">Scan</span>
              </span>
            </Link>
            <p className="mt-3 max-w-sm text-sm text-muted">
              ZScan is an open Block Explorer and Analytics Platform for Zcash, the privacy-preserving digital currency. No
              trackers, no ads.
            </p>
          </div>
          {COLUMNS.map((c) => (
            <div key={c.title}>
              <h3 className="mb-3 text-sm font-semibold">{c.title}</h3>
              <ul className="space-y-2 text-sm">
                {c.links.map(([href, label]) => (
                  <li key={href}>
                    <a href={href} className="text-muted hover:text-link">
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
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

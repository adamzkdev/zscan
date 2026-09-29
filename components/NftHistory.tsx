import type { ReactNode } from "react";
import { TimeAgo } from "./TimeAgo";
import { Empty, Zec } from "./ui";

type Event = { kind: string; price: number | null; time: string | null };

const P = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" } as const;
const svg = (d: ReactNode) => (
  <svg width={15} height={15} viewBox="0 0 24 24" {...P} aria-hidden>
    {d}
  </svg>
);

const Mint = svg(
  <>
    <path d="M12 3v4M12 17v4M3 12h4M17 12h4" />
    <path d="m12 8.5 1.2 2.3 2.3 1.2-2.3 1.2L12 15.5l-1.2-2.3L8.5 12l2.3-1.2Z" />
  </>,
);
const Tag = svg(
  <>
    <path d="M3.5 12.2V4.5a1 1 0 0 1 1-1h7.7l8.3 8.3a1.5 1.5 0 0 1 0 2.1l-6.6 6.6a1.5 1.5 0 0 1-2.1 0Z" />
    <circle cx="8" cy="8" r="1.3" />
  </>,
);
const Cancel = svg(
  <>
    <circle cx="12" cy="12" r="8.5" />
    <path d="m6 6 12 12" />
  </>,
);
const Cart = svg(
  <>
    <path d="M3 4h2.2l2.2 10.2a1.5 1.5 0 0 0 1.5 1.2h8.4a1.5 1.5 0 0 0 1.5-1.1L20.5 8H6.3" />
    <circle cx="9.5" cy="19.5" r="1.3" />
    <circle cx="17" cy="19.5" r="1.3" />
  </>,
);
const Handshake = svg(
  <>
    <path d="m11 17 2 2a1.4 1.4 0 0 0 2-2" />
    <path d="m14 14 2.5 2.5a1.4 1.4 0 0 0 2-2l-3.9-3.9a3 3 0 0 0-4.2 0l-.9.9a1.4 1.4 0 0 1-2-2l2.8-2.8a5 5 0 0 1 5.4-1.1l2.3 1L21 7" />
    <path d="m21 3 1 11h-2M3 3 2 14l6.5 6.5a1.4 1.4 0 0 0 2-2M3 4h8" />
  </>,
);
const Arrows = svg(
  <>
    <path d="M4 8h14l-3.5-3.5M20 16H6l3.5 3.5" />
  </>,
);
const Dot = svg(<circle cx="12" cy="12" r="3" />);

/** Label, icon and color (a theme token, so it follows light and dark) per marketplace event. */
const STYLE: Record<string, { label: string; icon: ReactNode; tone: string }> = {
  snark_minted: { label: "Minted", icon: Mint, tone: "text-accent bg-accent/12 ring-accent/35" },
  listing_created: { label: "Listed", icon: Tag, tone: "text-link bg-link/10 ring-link/30" },
  listing_cancelled: { label: "Listing cancelled", icon: Cancel, tone: "text-bad bg-bad/10 ring-bad/30" },
  order_paid: { label: "Sale", icon: Cart, tone: "text-good bg-good/12 ring-good/35" },
  offer_accepted: { label: "Sale (offer accepted)", icon: Handshake, tone: "text-good bg-good/12 ring-good/35" },
  snark_transferred: { label: "Transferred", icon: Arrows, tone: "text-muted bg-surface-2 ring-border-strong" },
};
const FALLBACK = { icon: Dot, tone: "text-muted bg-surface-2 ring-border-strong" };
const isSale = (k: string) => k === "order_paid" || k === "offer_accepted";

/** Change of a sale against the previous sale of the same item. */
function Delta({ pct }: { pct: number }) {
  const up = pct >= 0;
  return (
    <span className={`num text-[11px] font-medium ${up ? "text-good" : "text-bad"}`}>
      {up ? "▲" : "▼"} {Math.abs(pct) < 10 ? Math.abs(pct).toFixed(1) : Math.round(Math.abs(pct))}%
    </span>
  );
}

/** Newest first, each sale carrying its change against the previous sale. */
function timeline(events: Event[]) {
  const chrono = events
    .map((e, n) => ({ ...e, n }))
    .sort((a, b) => (a.time && b.time ? a.time.localeCompare(b.time) : 0) || a.n - b.n);
  const rows: (Event & { n: number; delta: number | null })[] = [];
  let prev: number | null = null;
  for (const e of chrono) {
    let delta: number | null = null;
    if (isSale(e.kind) && e.price != null) {
      if (prev) delta = ((e.price - prev) / prev) * 100;
      prev = e.price;
    }
    rows.push({ ...e, delta });
  }
  return rows.reverse();
}

/** An item's marketplace history as a timeline, newest first. */
export function NftHistory({ events }: { events: Event[] }) {
  if (!events.length) return <Empty>No history.</Empty>;
  const rows = timeline(events);

  return (
    <ol className="px-4 py-3">
      {rows.map((e, i) => {
        const s = STYLE[e.kind] ?? { ...FALLBACK, label: e.kind.replace(/_/g, " ") };
        const last = i === rows.length - 1;
        return (
          <li key={e.n} className="relative flex gap-3 pb-4 last:pb-0">
            {!last && <span className="absolute left-[15px] top-8 bottom-0 w-px bg-border" aria-hidden />}
            <span className={`relative grid size-8 shrink-0 place-items-center rounded-full ring-1 ${s.tone}`}>{s.icon}</span>
            <div className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-x-4 gap-y-0.5 pt-1.5">
              <span className={`text-sm ${isSale(e.kind) ? "font-semibold" : "font-medium"}`}>{s.label}</span>
              <span className="flex items-center gap-3 text-sm">
                {e.delta != null && <Delta pct={e.delta} />}
                {e.price != null && <Zec zat={e.price} decimals={4} />}
                <span className="w-24 text-right text-xs text-muted">{e.time ? <TimeAgo iso={e.time} /> : "—"}</span>
              </span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

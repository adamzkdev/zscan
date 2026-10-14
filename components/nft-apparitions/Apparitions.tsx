"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Stat } from "@/components/ui";
import { int, pct, zec } from "@/lib/format";
import type { Apparitions as Data, PurgedItem } from "@/lib/types";
import { BeforeAfter } from "./BeforeAfter";
import { Dna } from "./Dna";
import { Flow } from "./Flow";
import { hhmm, type FusionCell } from "./fusion";
import { FusionHero } from "./FusionHero";
import { Holes } from "./Holes";
import { Rings } from "./Rings";
import { median } from "./shared";
import { Strategies } from "./Strategies";

/** Rarity histogram: ranks in bins of this many. */
const BIN = 500;

type View = "fusion" | "before" | "holes" | "flow" | "strategies" | "rings" | "stats";
const VIEWS: [View, string][] = [
  ["fusion", "Fusion"],
  ["before", "Before / after"],
  ["holes", "Holes"],
  ["flow", "Flow"],
  ["strategies", "Strategies"],
  ["rings", "Rings"],
  ["stats", "Stats"],
];

export function Apparitions({ slug, name, data, initial }: { slug: string; name: string; data: Data; initial?: string }) {
  const enc = encodeURIComponent(slug);
  const itemHref = (item: string) => `/collection/${enc}/item/${item}`;

  const apps = useMemo(() => [...data.apparitions].sort((a, b) => a.slot - b.slot), [data.apparitions]);
  const bySlot = useMemo(() => {
    const m = new Map<number, PurgedItem[]>();
    for (const p of data.purged) m.set(p.slot, [...(m.get(p.slot) ?? []), p]);
    for (const l of m.values()) l.sort((a, b) => (a.rank ?? 1e9) - (b.rank ?? 1e9));
    return m;
  }, [data.purged]);
  const cells: FusionCell[] = useMemo(
    () =>
      apps.map((a) => ({
        slot: a.slot,
        item: a.item,
        at: a.unlocked_at ? Date.parse(a.unlocked_at) : NaN,
        ring: (bySlot.get(a.slot) ?? []).map((p) => Number(p.item)),
      })),
    [apps, bySlot],
  );

  // ---- Figures --------------------------------------------------------------------------------
  const minted = data.minted ?? 10_000;
  const ranks = data.purged.map((p) => p.rank).filter((r): r is number => r != null);
  const purgedMedian = median(ranks);
  const commonHalf = ranks.length ? ranks.filter((r) => r > minted / 2).length / ranks.length : null;
  const sold = data.purged.filter((p) => p.last != null);
  const soldValue = sold.reduce((a, p) => a + (p.last ?? 0), 0);

  const [view, setView] = useState<View>(VIEWS.some(([v]) => v === initial) ? (initial as View) : "fusion");
  // The view in the address, like the map's, so a link opens on it.
  useEffect(() => {
    const u = new URL(window.location.href);
    u.searchParams.set("tab", "apparitions");
    if (view === "fusion") u.searchParams.delete("av");
    else u.searchParams.set("av", view);
    if (u.href !== window.location.href) window.history.replaceState(window.history.state, "", u);
  }, [view]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Apparitions" value={`${apps.length} / ${data.slots}`} sub="all revealed" />
        <Stat label="Snarks purged" value={int(data.purged.length)} sub={`26 per Apparition, gone for good`} />
        <Stat
          label="Supply"
          value={int(data.supply)}
          sub={data.supply != null ? `−${pct(1 - data.supply / minted, 2)} of ${int(minted)} minted` : undefined}
        />
        <Stat
          label="Value purged"
          value={sold.length ? `${zec(soldValue, 1)} ZEC` : "—"}
          sub={`last sales of the ${int(sold.length)} that had sold`}
        />
      </div>

      <div className="flex flex-wrap gap-1 rounded-lg border border-border p-0.5 text-sm" role="tablist" aria-label="Apparitions view">
        {VIEWS.map(([v, label]) => (
          <button
            key={v}
            type="button"
            role="tab"
            aria-selected={view === v}
            onClick={() => setView(v)}
            className={`rounded-md px-2.5 py-1 ${view === v ? "bg-link text-white" : "text-muted hover:text-text"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {view === "fusion" && <FusionHero slug={slug} apps={apps} bySlot={bySlot} />}
      {view === "before" && <BeforeAfter slug={slug} apps={apps} bySlot={bySlot} />}
      {view === "holes" && <Holes slug={slug} apps={apps} bySlot={bySlot} />}
      {view === "flow" && <Flow slug={slug} apps={apps} bySlot={bySlot} />}
      {view === "strategies" && <Strategies slug={slug} apps={apps} bySlot={bySlot} minted={minted} />}
      {view === "rings" && <Rings slug={slug} name={name} data={data} apps={apps} bySlot={bySlot} cells={cells} />}
      {view === "stats" && (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            <Timeline cells={cells} names={apps.map((a) => a.name)} />
            <RankHistogram ranks={ranks} minted={minted} median={purgedMedian} commonHalf={commonHalf} />
          </div>

          <Dna slug={slug} apps={apps} bySlot={bySlot} />

      <details className="card group">
        <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium">
          Data table <span className="text-muted group-open:hidden">· show</span>
        </summary>
        <div className="overflow-x-auto border-t border-border">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-surface-2 text-xs">
              <tr>
                {["Apparition", "Item", "Revealed (UTC)", "Eyes", "Purged", "Median rank purged", "Rarest purged"].map((h) => (
                  <th key={h} className="whitespace-nowrap px-4 py-2 text-left font-semibold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {apps.map((a) => {
                const ps = bySlot.get(a.slot) ?? [];
                const rarest = ps[0];
                return (
                  <tr key={a.slot} className="border-b border-border last:border-0">
                    <td className="whitespace-nowrap px-4 py-2">{a.name}</td>
                    <td className="px-4 py-2">
                      <Link href={itemHref(a.item)} className="num text-link hover:underline">
                        #{a.item}
                      </Link>
                    </td>
                    <td className="num whitespace-nowrap px-4 py-2">{a.unlocked_at ? `${a.unlocked_at.slice(0, 10)} ${hhmm(Date.parse(a.unlocked_at))}` : "—"}</td>
                    <td className="whitespace-nowrap px-4 py-2">{a.traits.find((t) => t.trait_type === "Eyes")?.value ?? "—"}</td>
                    <td className="num px-4 py-2">{ps.length}</td>
                    <td className="num px-4 py-2">{int(median(ps.map((p) => p.rank).filter((r): r is number => r != null)))}</td>
                    <td className="num px-4 py-2">
                      {rarest ? (
                        <Link href={itemHref(rarest.item)} className="text-link hover:underline">
                          #{rarest.item}
                        </Link>
                      ) : (
                        "—"
                      )}
                      {rarest?.rank != null && <span className="text-muted"> · rank {int(rarest.rank)}</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </details>
      <p className="text-xs text-muted">
        Source: Zilkroad, the marketplace where zkSNARKs live. Who purged is not public. Each purge removes 26 snarks for good and transforms one treasury snark into the Apparition; no snark is minted.
      </p>
        </>
      )}
    </div>
  );
}

// ---- Charts -----------------------------------------------------------------------------------

const W = 560;
const H = 220;
const M = { l: 40, r: 12, t: 12, b: 28 };

/** Snarks purged over the evening: one step per Apparition. */
function Timeline({ cells, names }: { cells: FusionCell[]; names: string[] }) {
  const [hi, setHi] = useState<number | null>(null);
  const pts = cells
    .map((c, i) => ({ at: c.at, n: c.ring.length, i }))
    .filter((p) => Number.isFinite(p.at))
    .sort((a, b) => a.at - b.at);
  if (pts.length < 2) return null;
  const steps = pts.map((p, k) => ({ ...p, total: pts.slice(0, k + 1).reduce((a, q) => a + q.n, 0) }));
  const total = steps[steps.length - 1].total;
  const lo = steps[0].at - 5 * 60_000;
  const end = steps[steps.length - 1].at + 5 * 60_000;
  const x = (t: number) => M.l + ((t - lo) / (end - lo)) * (W - M.l - M.r);
  const top = Math.ceil(total / 200) * 200;
  const y = (v: number) => H - M.b - (v / top) * (H - M.t - M.b);
  let d = `M${x(lo)},${y(0)}`;
  for (const s of steps) d += ` H${x(s.at)} V${y(s.total)}`;
  d += ` H${x(end)}`;
  // A tick every 15 minutes.
  const ticks: number[] = [];
  for (let t = Math.ceil(lo / 900_000) * 900_000; t <= end; t += 900_000) ticks.push(t);
  const yTicks = Array.from({ length: top / 200 + 1 }, (_, i) => i * 200);
  const h = hi != null ? steps[hi] : null;
  return (
    <section className="card p-4">
      <h3 className="text-sm font-semibold">Snarks purged, minute by minute</h3>
      <p className="mb-2 text-xs text-muted">
        {steps[0].at && new Date(steps[0].at).toISOString().slice(0, 10)}, UTC. All {pts.length} Apparitions came out in {Math.round((pts[pts.length - 1].at - pts[0].at) / 60_000)} minutes.
      </p>
      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Cumulative snarks purged over time">
          {yTicks.map((v) => (
            <g key={v}>
              <line x1={M.l} x2={W - M.r} y1={y(v)} y2={y(v)} className="stroke-border" strokeWidth={1} />
              <text x={M.l - 6} y={y(v)} textAnchor="end" dominantBaseline="middle" className="fill-muted text-[10px]">
                {v}
              </text>
            </g>
          ))}
          {ticks.map((t) => (
            <text key={t} x={x(t)} y={H - 8} textAnchor="middle" className="fill-muted text-[10px]">
              {hhmm(t)}
            </text>
          ))}
          <path d={d} fill="none" className="stroke-link" strokeWidth={2} strokeLinejoin="round" />
          {steps.map((s, i) => (
            <circle key={s.i} cx={x(s.at)} cy={y(s.total)} r={hi === i ? 5 : 4} className="fill-link stroke-surface" strokeWidth={2} />
          ))}
          {steps.map((s, i) => {
            const next = steps[i + 1]?.at ?? end;
            const prev = steps[i - 1]?.at ?? lo;
            return (
              <rect
                key={`h${s.i}`}
                x={x((prev + s.at) / 2)}
                width={Math.max(4, x((s.at + next) / 2) - x((prev + s.at) / 2))}
                y={M.t}
                height={H - M.t - M.b}
                fill="transparent"
                onPointerEnter={() => setHi(i)}
                onPointerLeave={() => setHi(null)}
              />
            );
          })}
        </svg>
        {h && (
          <div
            className="pointer-events-none absolute rounded-md border border-border bg-surface px-2.5 py-1.5 text-xs shadow-lg"
            style={{ left: `${Math.min(70, (x(h.at) / W) * 100)}%`, top: `${(y(h.total) / H) * 100}%`, transform: "translate(8px, -110%)" }}
          >
            <p className="font-medium">{names[h.i]}</p>
            <p className="num text-muted">
              {hhmm(h.at)} UTC · {int(h.total)} purged so far
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

/** Which snarks holders chose to let go, by rarity rank, against a random pick. */
function RankHistogram({ ranks, minted, median: med, commonHalf }: { ranks: number[]; minted: number; median: number | null; commonHalf: number | null }) {
  const [hi, setHi] = useState<number | null>(null);
  if (!ranks.length) return null;
  const nb = Math.ceil(minted / BIN);
  const bins = Array.from({ length: nb }, () => 0);
  for (const r of ranks) bins[Math.min(nb - 1, Math.floor((r - 1) / BIN))]++;
  const expected = ranks.length / nb;
  const top = Math.ceil(Math.max(expected, ...bins) / 20) * 20;
  const bw = (W - M.l - M.r) / nb;
  const y = (v: number) => H - M.b - (v / top) * (H - M.t - M.b);
  const yTicks = Array.from({ length: top / 20 + 1 }, (_, i) => i * 20).filter((v) => top <= 100 || v % 40 === 0);
  const h = hi != null ? { i: hi, n: bins[hi] } : null;
  const bar = (i: number, n: number) => {
    // Thin bars with a 2 px gap, rounded at the data end only.
    const x0 = M.l + i * bw + 1;
    const w = bw - 2;
    const y0 = y(n);
    const r = Math.min(4, w / 2, H - M.b - y0);
    return `M${x0},${H - M.b} V${y0 + r} Q${x0},${y0} ${x0 + r},${y0} H${x0 + w - r} Q${x0 + w},${y0} ${x0 + w},${y0 + r} V${H - M.b} Z`;
  };
  return (
    <section className="card p-4">
      <h3 className="text-sm font-semibold">Which snarks were purged, by rarity</h3>
      <p className="mb-2 text-xs text-muted">
        Median rank {int(med)} of {int(minted)}
        {commonHalf != null && ` · ${pct(commonHalf, 0)} from the commoner half`}. Dashed: what a random pick would give.
      </p>
      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Purged snarks by rarity rank">
          {yTicks.map((v) => (
            <g key={v}>
              <line x1={M.l} x2={W - M.r} y1={y(v)} y2={y(v)} className="stroke-border" strokeWidth={1} />
              <text x={M.l - 6} y={y(v)} textAnchor="end" dominantBaseline="middle" className="fill-muted text-[10px]">
                {v}
              </text>
            </g>
          ))}
          {bins.map((n, i) =>
            n > 0 ? <path key={i} d={bar(i, n)} className={`fill-link ${hi === i ? "" : "opacity-80"}`} /> : null,
          )}
          <line x1={M.l} x2={W - M.r} y1={y(expected)} y2={y(expected)} className="stroke-muted" strokeWidth={1.5} strokeDasharray="4 4" />
          {[0, nb / 4, nb / 2, (nb * 3) / 4, nb].map((b) => (
            <text key={b} x={M.l + b * bw} y={H - 8} textAnchor={b === 0 ? "start" : b === nb ? "end" : "middle"} className="fill-muted text-[10px]">
              {b === 0 ? "rarest" : b === nb ? "commonest" : int(b * BIN)}
            </text>
          ))}
          {bins.map((_, i) => (
            <rect
              key={`h${i}`}
              x={M.l + i * bw}
              width={bw}
              y={M.t}
              height={H - M.t - M.b}
              fill="transparent"
              onPointerEnter={() => setHi(i)}
              onPointerLeave={() => setHi(null)}
            />
          ))}
        </svg>
        {h && (
          <div
            className="pointer-events-none absolute rounded-md border border-border bg-surface px-2.5 py-1.5 text-xs shadow-lg"
            style={{ left: `${Math.min(70, ((M.l + h.i * bw) / W) * 100)}%`, top: `${(y(h.n) / H) * 100}%`, transform: "translate(8px, -110%)" }}
          >
            <p className="font-medium">
              Ranks {int(h.i * BIN + 1)}–{int(Math.min(minted, (h.i + 1) * BIN))}
            </p>
            <p className="num text-muted">
              {h.n} purged · random pick ≈ {expected.toFixed(0)}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

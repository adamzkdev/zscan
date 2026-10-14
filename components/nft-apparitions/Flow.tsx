"use client";

import { useMemo, useState } from "react";
import { chip } from "@/components/NftMarket";
import type { Apparition, PurgedItem } from "@/lib/types";
import { fold, namedValues, TRAIT_STYLE, TRAIT_TYPES, traitColor, traitOf } from "./shared";

const W = 820;
const H = 640;
const PAD = 8;
/** Left labels and right thumbnails. */
const LEFT = 150;
const RIGHT = 70;
const NODE = 12;

/** Trait values of the purged snarks flowing into the Apparitions they revealed. */
export function Flow({ slug, apps, bySlot }: { slug: string; apps: Apparition[]; bySlot: Map<number, PurgedItem[]> }) {
  const enc = encodeURIComponent(slug);
  const [type, setType] = useState("Lineage");
  const [hi, setHi] = useState<{ cat?: string; slot?: number } | null>(null);

  const g = useMemo(() => {
    const all = apps.flatMap((a) => bySlot.get(a.slot) ?? []);
    const named = namedValues(all, type);
    const cats = [...named, ...(all.some((p) => !named.includes(traitOf(p, type))) ? ["Other"] : [])];
    // counts[app][cat]
    const counts = apps.map((a) => {
      const m = new Map<string, number>();
      for (const p of bySlot.get(a.slot) ?? []) {
        const c = fold(named, traitOf(p, type));
        m.set(c, (m.get(c) ?? 0) + 1);
      }
      return m;
    });
    // Apparitions grouped by their main value, so ribbons cross as little as they can.
    const order = apps
      .map((_, i) => i)
      .sort((x, y) => {
        const main = (i: number) => cats.reduce((b, c) => ((counts[i].get(c) ?? 0) > (counts[i].get(b) ?? 0) ? c : b), cats[0]);
        const dx = cats.indexOf(main(x)) - cats.indexOf(main(y));
        return dx || (counts[y].get(main(y)) ?? 0) - (counts[x].get(main(x)) ?? 0);
      });
    const total = all.length;
    const rightGap = 3;
    const unit = (H - 2 * PAD - rightGap * (apps.length - 1)) / total;
    const leftGap = 10;
    const leftH = total * unit + leftGap * (cats.length - 1);
    const catTotal = cats.map((c) => counts.reduce((a, m) => a + (m.get(c) ?? 0), 0));
    // Node tops.
    let y = (H - leftH) / 2;
    const catY = cats.map((_, i) => {
      const t = y;
      y += catTotal[i] * unit + leftGap;
      return t;
    });
    y = PAD;
    const appY = new Map<number, number>();
    for (const i of order) {
      appY.set(i, y);
      const n = cats.reduce((a, c) => a + (counts[i].get(c) ?? 0), 0);
      y += n * unit + rightGap;
    }
    // Ribbons, stacked on both sides in the other side's order.
    const x0 = LEFT;
    const x1 = W - RIGHT;
    const catOff = cats.map(() => 0);
    const ribbons: { cat: string; slot: number; n: number; d: string }[] = [];
    for (const i of order) {
      let off = 0;
      cats.forEach((c, ci) => {
        const n = counts[i].get(c) ?? 0;
        if (!n) return;
        const t = n * unit;
        const ya = catY[ci] + catOff[ci];
        const yb = appY.get(i)! + off;
        const xm = (x0 + NODE + x1) / 2;
        ribbons.push({
          cat: c,
          slot: apps[i].slot,
          n,
          d: `M${x0 + NODE},${ya} C${xm},${ya} ${xm},${yb} ${x1},${yb} L${x1},${yb + t} C${xm},${yb + t} ${xm},${ya + t} ${x0 + NODE},${ya + t} Z`,
        });
        catOff[ci] += t;
        off += t;
      });
    }
    return { named, cats, catTotal, catY, appY, order, counts, unit, ribbons };
  }, [apps, bySlot, type]);

  const lit = (cat: string, slot: number) => !hi || (hi.cat != null && hi.cat === cat) || (hi.slot != null && hi.slot === slot);
  const caption = (() => {
    if (!hi) return "Hover a value or an Apparition.";
    if (hi.slot != null) {
      const i = apps.findIndex((a) => a.slot === hi.slot);
      const parts = g.cats.map((c) => [c, g.counts[i].get(c) ?? 0] as const).filter(([, n]) => n > 0);
      return `${apps[i].name}: ${parts.map(([c, n]) => `${n} ${c}`).join(", ")}`;
    }
    const ci = g.cats.indexOf(hi.cat!);
    const into = apps.filter((_, i) => (g.counts[i].get(hi.cat!) ?? 0) > 0).length;
    return `${hi.cat}: ${g.catTotal[ci]} snarks purged, into ${into} of ${apps.length} Apparitions`;
  })();

  return (
    <section className="card viz-traits p-4">
      <style>{TRAIT_STYLE}</style>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold">Where each Apparition came from</h2>
          <p className="text-xs text-muted">Every purged snark, from its {type.toLowerCase()} on the left to the Apparition it revealed on the right.</p>
        </div>
        <div className="flex flex-wrap gap-1.5 text-xs">
          {TRAIT_TYPES.map((t) => (
            <button key={t} type="button" onClick={() => setType(t)} className={chip(type === t)}>
              {t}
            </button>
          ))}
        </div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="mt-3 w-full" role="img" aria-label={`Purged snarks by ${type} flowing into the Apparitions`} onPointerLeave={() => setHi(null)}>
        {g.ribbons.map((r, k) => (
          <path
            key={k}
            d={r.d}
            fill={traitColor(g.named, r.cat)}
            opacity={lit(r.cat, r.slot) ? (hi ? 0.85 : 0.5) : 0.07}
            onPointerEnter={() => setHi({ slot: r.slot })}
          />
        ))}
        {g.cats.map((c, ci) => (
          <g key={c} onPointerEnter={() => setHi({ cat: c })} className="cursor-default">
            <rect x={LEFT} y={g.catY[ci]} width={NODE} height={Math.max(1, g.catTotal[ci] * g.unit)} rx={2} fill={traitColor(g.named, c)} />
            <text x={LEFT - 8} y={g.catY[ci] + (g.catTotal[ci] * g.unit) / 2} textAnchor="end" dominantBaseline="middle" className="fill-text text-[10px]">
              {c}
              <tspan className="fill-muted"> {g.catTotal[ci]}</tspan>
            </text>
          </g>
        ))}
        {g.order.map((i) => {
          const a = apps[i];
          const y = g.appY.get(i)!;
          const h = 26 * g.unit;
          const s = Math.min(18, h + 2);
          return (
            <g key={a.slot} onPointerEnter={() => setHi({ slot: a.slot })}>
              <rect x={W - RIGHT} y={y} width={4} height={h} className="fill-muted" />
              <image href={`/v1/collections/${enc}/items/${a.item}/image?ap=${a.slot}`} x={W - RIGHT + 8} y={y + h / 2 - s / 2} width={s} height={s} style={{ imageRendering: "pixelated" }} />
              <text x={W - RIGHT + 8 + s + 4} y={y + h / 2} dominantBaseline="middle" className={`text-[10px] ${hi?.slot === a.slot ? "fill-text font-semibold" : "fill-muted"}`}>
                {String(a.slot).padStart(2, "0")}
              </text>
            </g>
          );
        })}
      </svg>
      <p className="mt-1 min-h-4 text-xs text-muted" aria-live="polite">
        {caption}
      </p>
    </section>
  );
}

"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { chip } from "@/components/NftMarket";
import type { Apparition, PurgedItem } from "@/lib/types";

const TYPES = ["Lineage", "Skin", "Eyes", "Head"];
/** Named values; the rest fold into "Other". */
const NAMED = 6;

/** What each Apparition was made of: its snarks' trait values, one stacked bar each. */
export function Dna({ slug, apps, bySlot }: { slug: string; apps: Apparition[]; bySlot: Map<number, PurgedItem[]> }) {
  const enc = encodeURIComponent(slug);
  const [type, setType] = useState("Lineage");
  const [hi, setHi] = useState<{ row: number; value: string; n: number; total: number } | null>(null);

  // The most common values among all purged snarks get colours, in that order, for every row.
  const { named, rows, all } = useMemo(() => {
    const value = (p: PurgedItem) => p.traits.find((t) => t.trait_type === type)?.value ?? "—";
    const count = (ps: PurgedItem[]) => {
      const m = new Map<string, number>();
      for (const p of ps) m.set(value(p), (m.get(value(p)) ?? 0) + 1);
      return m;
    };
    const everything = apps.flatMap((a) => bySlot.get(a.slot) ?? []);
    const totals = [...count(everything)].sort((a, b) => b[1] - a[1]);
    const named = totals.slice(0, totals.length > NAMED + 1 ? NAMED : NAMED + 1).map(([v]) => v);
    const fold = (m: Map<string, number>) => {
      const out: [string, number][] = named.map((v) => [v, m.get(v) ?? 0]);
      const other = [...m].filter(([v]) => !named.includes(v)).reduce((a, [, n]) => a + n, 0);
      if (other) out.push(["Other", other]);
      return out;
    };
    return {
      named,
      all: fold(count(everything)),
      rows: apps.map((a) => fold(count(bySlot.get(a.slot) ?? []))),
    };
  }, [apps, bySlot, type]);

  // Apparitions whose 26 snarks all share one value.
  const pure = rows.flatMap((r) => {
    const used = r.filter(([, n]) => n > 0);
    return used.length === 1 && used[0][0] !== "Other" ? [used[0][0]] : [];
  });
  const color = (v: string) => (v === "Other" ? "var(--dna-other)" : `var(--dna-${named.indexOf(v) + 1})`);

  const bar = (segs: [string, number][], row: number, h: number) => {
    const total = segs.reduce((a, [, n]) => a + n, 0);
    return (
      <div className="flex w-full gap-0.5" style={{ height: h }}>
        {segs
          .filter(([, n]) => n > 0)
          .map(([v, n]) => (
            <div
              key={v}
              className={`first:rounded-l last:rounded-r ${hi && hi.value !== v ? "opacity-40" : ""}`}
              style={{ flexGrow: n, flexBasis: 0, background: color(v) }}
              onPointerEnter={() => setHi({ row, value: v, n, total })}
              onPointerLeave={() => setHi(null)}
            />
          ))}
      </div>
    );
  };

  return (
    <section className="card viz-dna p-4">
      {/* Categorical slots 1–6 (light and dark steps, validated in order) and a neutral "Other". */}
      <style>{`
        .viz-dna { --dna-1:#2a78d6; --dna-2:#eb6834; --dna-3:#1baf7a; --dna-4:#eda100; --dna-5:#e87ba4; --dna-6:#008300; --dna-other:#a3a29b; }
        @media (prefers-color-scheme: dark) { :root:where(:not([data-theme="light"])) .viz-dna { --dna-1:#3987e5; --dna-2:#d95926; --dna-3:#199e70; --dna-4:#c98500; --dna-5:#d55181; --dna-6:#008300; --dna-other:#5f5e59; } }
        :root[data-theme="dark"] .viz-dna { --dna-1:#3987e5; --dna-2:#d95926; --dna-3:#199e70; --dna-4:#c98500; --dna-5:#d55181; --dna-6:#008300; --dna-other:#5f5e59; }
      `}</style>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold">What each Apparition is made of</h3>
          <p className="text-xs text-muted">
            The {type.toLowerCase()} of the 26 snarks purged for each one.
            {pure.length > 0 && ` ${pure.length} of ${apps.length} were made from one ${type.toLowerCase()} only: ${[...new Set(pure)].join(", ")}.`}
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5 text-xs">
          {TYPES.map((t) => (
            <button key={t} type="button" onClick={() => setType(t)} className={chip(type === t)}>
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs" aria-label="Legend">
        {[...named, ...(all.some(([v]) => v === "Other") ? ["Other"] : [])].map((v) => (
          <span key={v} className="inline-flex items-center gap-1.5">
            <span className="inline-block size-2.5 rounded-sm" style={{ background: color(v) }} />
            <span className="text-text">{v}</span>
          </span>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-[2.25rem_minmax(0,1fr)_2.5rem] items-center gap-x-2 gap-y-1">
        <span className="text-[10px] font-medium text-muted">All</span>
        <div className="py-1">{bar(all, -1, 14)}</div>
        <span className="num text-right text-[10px] text-muted">{all.reduce((a, [, n]) => a + n, 0)}</span>
        {apps.map((a, i) => (
          <div key={a.slot} className="contents">
            <Link href={`/collection/${enc}/item/${a.item}`} title={a.name} className="block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/v1/collections/${enc}/items/${a.item}/image?ap=${a.slot}`} alt={a.name} width={20} height={20} loading="lazy" className="rounded-sm bg-black [image-rendering:pixelated]" />
            </Link>
            {bar(rows[i], i, 10)}
            <span className="num text-right text-[10px] text-muted">{String(a.slot).padStart(2, "0")}</span>
          </div>
        ))}
      </div>
      <p className="mt-2 h-4 text-xs text-muted" aria-live="polite">
        {hi ? `${hi.row < 0 ? "All Apparitions" : apps[hi.row].name}: ${hi.value}, ${hi.n} of ${hi.total}` : "Hover a segment."}
      </p>
    </section>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { chip } from "@/components/NftMarket";
import { int, zec } from "@/lib/format";
import type { Apparition, CollectionMap, PurgedItem } from "@/lib/types";
import { median } from "./shared";

/** Thumbnail side, and the vertical offset of each extra lane when thumbnails crowd. */
const T = 18;
const LANES = [0, -7, 7];
const ROW = T + 16;
const LABEL = 64;

type Sort = "median" | "slot";

/** One row per purge: its 26 snarks placed by rarity rank, so each holder's choice shows. */
export function Strategies({ slug, apps, bySlot, minted }: { slug: string; apps: Apparition[]; bySlot: Map<number, PurgedItem[]>; minted: number }) {
  const enc = encodeURIComponent(slug);
  const box = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(0);
  const [atlas, setAtlas] = useState<{ url: string; cell: number; cols: number } | null>(null);
  const [sort, setSort] = useState<Sort>("median");
  const [hi, setHi] = useState<{ p: PurgedItem; a: Apparition; x: number; y: number } | null>(null);

  useEffect(() => {
    const b = box.current;
    if (!b) return;
    const ro = new ResizeObserver(() => setW(b.clientWidth));
    ro.observe(b);
    setW(b.clientWidth);
    let live = true;
    fetch(`/v1/collections/${enc}/map`)
      .then((r) => (r.ok ? (r.json() as Promise<CollectionMap>) : Promise.reject()))
      .then((m) => live && setAtlas({ url: m.atlas.url, cell: m.atlas.cell, cols: m.atlas.cols }))
      .catch(() => {});
    return () => {
      live = false;
      ro.disconnect();
    };
  }, [enc]);

  const rows = useMemo(() => {
    const list = apps.map((a) => {
      const ps = bySlot.get(a.slot) ?? [];
      return { a, ps, med: median(ps.map((p) => p.rank).filter((r): r is number => r != null)) ?? minted };
    });
    return sort === "median" ? list.sort((x, y) => x.med - y.med) : list;
  }, [apps, bySlot, minted, sort]);

  const plot = Math.max(0, w - LABEL - 12);
  const x = (rank: number) => LABEL + ((rank - 1) / Math.max(1, minted - 1)) * plot;
  const sprite = (id: number) =>
    atlas
      ? {
          backgroundImage: `url(${atlas.url})`,
          backgroundSize: `${atlas.cols * T}px auto`,
          backgroundPosition: `-${((id - 1) % atlas.cols) * T}px -${Math.floor((id - 1) / atlas.cols) * T}px`,
        }
      : { background: "#2a2d32" };

  /** Lanes so thumbnails crowd less: each goes in the first lane where it doesn't overlap. */
  const lanes = (ps: PurgedItem[]) => {
    const last = LANES.map(() => -Infinity);
    const out = new Map<string, number>();
    for (const p of [...ps].sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0))) {
      const px = x(p.rank ?? minted);
      let lane = last.findIndex((l) => px - l >= T * 0.85);
      if (lane < 0) lane = last.indexOf(Math.min(...last));
      last[lane] = px;
      out.set(p.item, lane);
    }
    return out;
  };

  const sweeps = rows.filter((r) => r.med > minted * 0.7).length;
  const rare = rows.filter((r) => r.med < minted * 0.4).length;

  return (
    <section className="card p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold">What each holder chose to purge</h2>
          <p className="text-xs text-muted">
            One row per Apparition: its 26 snarks placed by rarity rank. {sweeps} purges took mostly common snarks (median rank past {int(minted * 0.7)}), {rare} gave up rarer ones.
          </p>
        </div>
        <div className="flex gap-1.5 text-xs">
          <button type="button" onClick={() => setSort("median")} className={chip(sort === "median")}>
            By median rank
          </button>
          <button type="button" onClick={() => setSort("slot")} className={chip(sort === "slot")}>
            By number
          </button>
        </div>
      </div>

      <div ref={box} className="relative mt-3 overflow-hidden" style={{ height: rows.length * ROW + 24 }} onPointerLeave={() => setHi(null)}>
        {w > 0 && (
          <>
            {/* Axis: rarest left, with the collection's middle. */}
            {[1, minted / 4, minted / 2, (minted * 3) / 4, minted].map((r) => (
              <div key={r} className="absolute top-0 border-l border-border" style={{ left: x(r), height: rows.length * ROW + 6, borderStyle: r === minted / 2 ? "dashed" : "solid" }} />
            ))}
            {[1, minted / 4, minted / 2, (minted * 3) / 4, minted].map((r) => (
              <span
                key={`l${r}`}
                className="num absolute text-[10px] text-muted"
                style={{ left: x(r), top: rows.length * ROW + 8, transform: r === 1 ? "none" : r === minted ? "translateX(-100%)" : "translateX(-50%)" }}
              >
                {r === 1 ? "rarest" : r === minted ? "commonest" : int(r)}
              </span>
            ))}
            {rows.map(({ a, ps, med }, ri) => {
              const lane = lanes(ps);
              const top = ri * ROW;
              return (
                <div key={a.slot} className="absolute inset-x-0" style={{ top, height: ROW }}>
                  <Link href={`/collection/${enc}/item/${a.item}`} className="absolute left-0 flex items-center gap-1.5" style={{ top: ROW / 2 - 11 }} title={a.name}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`/v1/collections/${enc}/items/${a.item}/image?ap=${a.slot}`} alt={a.name} width={22} height={22} className="rounded-sm bg-black [image-rendering:pixelated]" />
                    <span className="num text-[11px] text-muted">{String(a.slot).padStart(2, "0")}</span>
                  </Link>
                  {/* The row's median. */}
                  <div className="absolute w-0.5 rounded bg-link" style={{ left: x(med) - 1, top: 3, height: ROW - 6 }} title={`Median rank ${int(med)}`} />
                  {ps.map((p) => (
                    <Link
                      key={p.item}
                      href={`/collection/${enc}/item/${p.item}`}
                      className="absolute rounded-[2px] ring-1 ring-black/40 hover:z-10 hover:scale-150"
                      style={{ left: x(p.rank ?? minted) - T / 2, top: ROW / 2 - T / 2 + LANES[lane.get(p.item) ?? 0], width: T, height: T, imageRendering: "pixelated", ...sprite(Number(p.item)) }}
                      onPointerEnter={() => setHi({ p, a, x: x(p.rank ?? minted), y: top })}
                      aria-label={`#${p.item}, rank ${int(p.rank)}`}
                    />
                  ))}
                </div>
              );
            })}
            {hi && (
              <div
                className="pointer-events-none absolute z-20 rounded-md border border-border bg-surface px-2.5 py-1.5 text-xs shadow-lg"
                style={{ left: Math.min(hi.x + 12, w - 200), top: hi.y + ROW }}
              >
                <p className="font-medium">#{hi.p.item}</p>
                <p className="text-muted">
                  Rank {int(hi.p.rank)} · purged for {hi.a.name}
                </p>
                {hi.p.last != null && <p className="text-muted">Last sale {zec(hi.p.last, 2)} ZEC</p>}
              </div>
            )}
          </>
        )}
      </div>
      <p className="mt-1 text-xs text-muted">Blue tick: each purge&apos;s median rank. Dashed: the middle of the collection.</p>
    </section>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { chip } from "@/components/NftMarket";
import { download, poster } from "@/components/nft-map/share";
import { STAGE } from "@/components/nft-map/draw";
import { int } from "@/lib/format";
import type { Apparition, CollectionMap, PurgedItem } from "@/lib/types";
import { hhmm } from "./fusion";
import { HoleStage, type HoleGroup, type HoleHit, type Order } from "./hole-stage";

/** The whole collection as a mosaic: each purged snark leaves a hole, threaded to its Apparition. */
export function Holes({ slug, apps, bySlot }: { slug: string; apps: Apparition[]; bySlot: Map<number, PurgedItem[]> }) {
  const enc = encodeURIComponent(slug);
  const canvas = useRef<HTMLCanvasElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const stage = useRef<HoleStage | null>(null);
  const [order, setOrder] = useState<Order>("rank");
  const [clock, setClock] = useState<{ t: number; n: number }>({ t: Infinity, n: apps.length });
  const [hover, setHover] = useState<{ hit: NonNullable<HoleHit>; x: number; y: number; w: number } | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const c = canvas.current;
    const b = box.current;
    if (!c || !b) return;
    const groups: HoleGroup[] = apps.map((a) => ({
      slot: a.slot,
      at: a.unlocked_at ? Date.parse(a.unlocked_at) : NaN,
      items: (bySlot.get(a.slot) ?? []).map((p) => Number(p.item)),
    }));
    let last = { t: NaN, n: -1 };
    const e = new HoleStage(c, groups, {
      onTick: (t, n) => {
        const minute = Number.isFinite(t) ? Math.floor(t / 60_000) : Infinity;
        if (minute !== last.t || n !== last.n) {
          last = { t: minute, n };
          setClock({ t, n });
        }
      },
      onHover: (hit, x, y) => setHover(hit ? { hit, x, y, w: b.clientWidth } : null),
    });
    stage.current = e;
    const ro = new ResizeObserver(() => e.resize(b.clientWidth));
    ro.observe(b);
    e.resize(b.clientWidth);

    let live = true;
    fetch(`/v1/collections/${enc}/map`)
      .then((r) => (r.ok ? (r.json() as Promise<CollectionMap>) : Promise.reject()))
      .then((m) => {
        if (!live) return;
        e.setItems(m.items.map(([id, rank]) => ({ id, rank })));
        const full = new Image();
        full.onload = () => e.setAtlas(full, m.atlas.cell, m.atlas.cols);
        const small = new Image();
        small.onload = () => {
          if (!full.complete) e.setAtlas(small, m.atlas.cell / 2, m.atlas.cols);
        };
        small.src = m.atlas.preview;
        full.src = m.atlas.url;
      })
      .catch(() => live && setFailed(true));
    for (const a of apps) {
      const img = new Image();
      img.onload = () => e.setArt(a.slot, img);
      img.src = `/v1/collections/${enc}/items/${a.item}/image?ap=${a.slot}`;
    }

    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const io = new IntersectionObserver(
      ([en]) => {
        if (en.isIntersecting) {
          io.disconnect();
          if (!still) e.play();
        }
      },
      { threshold: 0.3 },
    );
    io.observe(c);
    return () => {
      live = false;
      io.disconnect();
      ro.disconnect();
      e.destroy();
      stage.current = null;
    };
  }, [apps, bySlot, enc]);

  useEffect(() => stage.current?.setOrder(order), [order]);

  const playing = Number.isFinite(clock.t);
  const onPng = async () => {
    const e = stage.current;
    if (!e) return;
    const b = await poster({
      title: "zkSNARKs · where the purged came from",
      subtitle: `All 10,000 by ${order === "rank" ? "rarity (rarest top-left)" : "number"}: ${int(apps.reduce((n, a) => n + (bySlot.get(a.slot)?.length ?? 0), 0))} holes, each threaded to its Apparition`,
      tagline: "zscan.cash · Zcash NFT data",
      legend: [
        { color: STAGE.bg, label: "purged snark", box: true, ring: true },
        { color: STAGE.accent, label: "to the Apparition it revealed" },
      ],
      render: (ctx, w, h) => e.renderTo(ctx, w, h),
    });
    if (b) download(b, `${slug}-apparitions-holes-zscan.png`);
  };

  const tip = (() => {
    if (!hover) return null;
    const a = apps[hover.hit.group];
    const ps = bySlot.get(a.slot) ?? [];
    if (hover.hit.item != null) {
      const p = ps.find((x) => Number(x.item) === hover.hit.item);
      return (
        <>
          <p className="font-medium">#{hover.hit.item}</p>
          <p className="text-muted">
            Rank {int(p?.rank)} · purged for {a.name}
          </p>
        </>
      );
    }
    return (
      <>
        <p className="font-medium">{a.name}</p>
        <p className="text-muted">
          {ps.length} snarks · {a.unlocked_at ? `${hhmm(Date.parse(a.unlocked_at))} UTC` : ""}
        </p>
      </>
    );
  })();

  if (failed) return null;

  return (
    <section className="card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold">Holes in the collection</h2>
          <p className="num text-xs text-muted">
            {playing
              ? `${hhmm(clock.t)} UTC · ${clock.n} / ${apps.length} revealed`
              : "All 10,000 zkSNARKs. Each purged one leaves a hole, threaded to the Apparition it revealed. Hover an Apparition."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <button type="button" onClick={() => setOrder("rank")} className={chip(order === "rank")}>
            By rarity
          </button>
          <button type="button" onClick={() => setOrder("id")} className={chip(order === "id")}>
            By number
          </button>
          <button type="button" onClick={() => (playing ? stage.current?.finish() : stage.current?.play())} className="rounded-md border border-border px-2.5 py-1 hover:border-link hover:text-link">
            {playing ? "Skip" : "Replay"}
          </button>
          <button type="button" onClick={onPng} className="rounded-md border border-border px-2.5 py-1 hover:border-link hover:text-link">
            Download PNG
          </button>
        </div>
      </div>
      <div ref={box} className="relative" style={{ background: STAGE.bg }}>
        <canvas ref={canvas} className="block w-full touch-manipulation" aria-label="The zkSNARKs collection with every purged snark threaded to its Apparition" />
        {order === "rank" && (
          <>
            <span className="pointer-events-none absolute left-1/2 top-1 hidden -translate-x-1/2 text-[10px] sm:block" style={{ color: STAGE.faint }}>
              rarest
            </span>
            <span className="pointer-events-none absolute bottom-0.5 left-1/2 hidden -translate-x-1/2 text-[10px] sm:block" style={{ color: STAGE.faint }}>
              commonest
            </span>
          </>
        )}
        {hover && tip && (
          <div
            className="pointer-events-none absolute z-10 max-w-56 rounded-md border border-border bg-surface px-2.5 py-1.5 text-xs shadow-lg"
            style={{ left: Math.max(0, Math.min(hover.x + 14, hover.w - 230)), top: hover.y + 14 }}
          >
            {tip}
          </div>
        )}
      </div>
    </section>
  );
}

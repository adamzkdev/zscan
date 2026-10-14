"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { download, poster, shareFile, tweet } from "@/components/nft-map/share";
import { STAGE } from "@/components/nft-map/draw";
import { int, zec } from "@/lib/format";
import type { Apparition, Apparitions as Data, PurgedItem } from "@/lib/types";
import { FusionStage, hhmm, type FusionCell, type Hit } from "./fusion";
import { median } from "./shared";

/** The collection map's atlas: item `n` at slot `n - 1`, 100 per row. */
const ATLAS_COLS = 100;
const ATLAS_CELL = 32;

/** Every Apparition in a grid, ringed by the 26 snarks purged for it; click one for details. */
export function Rings({
  slug,
  name,
  data,
  apps,
  bySlot,
  cells,
}: {
  slug: string;
  name: string;
  data: Data;
  apps: Apparition[];
  bySlot: Map<number, PurgedItem[]>;
  cells: FusionCell[];
}) {
  const enc = encodeURIComponent(slug);
  const art = (item: string, slot?: number) => `/v1/collections/${enc}/items/${item}/image${slot ? `?ap=${slot}` : ""}`;
  const itemHref = (item: string) => `/collection/${enc}/item/${item}`;
  const minted = data.minted ?? 10_000;

  // ---- Fusion stage ---------------------------------------------------------------------------
  const canvas = useRef<HTMLCanvasElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const stage = useRef<FusionStage | null>(null);
  const [clock, setClock] = useState<{ t: number; n: number }>({ t: Infinity, n: apps.length });
  const [hover, setHover] = useState<{ hit: NonNullable<Hit>; x: number; y: number; w: number } | null>(null);
  const [sel, setSel] = useState(-1);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  useEffect(() => {
    const c = canvas.current;
    const b = box.current;
    if (!c || !b) return;
    let last = { t: NaN, n: -1 };
    const e = new FusionStage(c, cells, {
      onTick: (t, n) => {
        // Re-render only when the shown minute or count changes.
        const minute = Number.isFinite(t) ? Math.floor(t / 60_000) : Infinity;
        if (minute !== last.t || n !== last.n) {
          last = { t: minute, n };
          setClock({ t, n });
        }
      },
      onHover: (hit, x, y) => setHover(hit ? { hit, x, y, w: b.clientWidth } : null),
      onSelect: (i) => setSel((s) => (s === i ? -1 : i)),
    });
    stage.current = e;
    const ro = new ResizeObserver(() => e.resize(b.clientWidth));
    ro.observe(b);
    e.resize(b.clientWidth);

    const atlas = new Image();
    atlas.decoding = "async";
    atlas.onload = () => e.setAtlas(atlas, ATLAS_CELL, ATLAS_COLS);
    // Half-size first, so thumbnails show at once.
    const small = new Image();
    small.onload = () => {
      if (!atlas.complete) e.setAtlas(small, ATLAS_CELL / 2, ATLAS_COLS);
    };
    small.src = `/v1/collections/${enc}/map/image?size=small`;
    atlas.src = `/v1/collections/${enc}/map/image`;
    for (const c of cells) {
      const img = new Image();
      img.onload = () => e.setArt(c.slot, img);
      img.src = `/v1/collections/${enc}/items/${c.item}/image?ap=${c.slot}`;
    }

    // Play once when it scrolls into view, unless motion is reduced.
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const io = new IntersectionObserver(
      ([en]) => {
        if (en.isIntersecting) {
          io.disconnect();
          if (!still) e.play();
        }
      },
      { threshold: 0.25 },
    );
    io.observe(c);
    return () => {
      io.disconnect();
      ro.disconnect();
      e.destroy();
      stage.current = null;
    };
  }, [cells, enc]);

  useEffect(() => stage.current?.select(sel), [sel]);

  const playing = Number.isFinite(clock.t);
  const purgedSoFar = cells.filter((c) => playing && c.at <= clock.t).reduce((a, c) => a + c.ring.length, 0);

  // ---- Share ----------------------------------------------------------------------------------
  const title = `${name} · Apparitions`;
  const subtitle = `${int(data.purged.length)} snarks purged, 26 for each of ${apps.length} Apparitions · supply ${int(data.supply)} of ${int(minted)}`;
  const file = `${slug}-apparitions-zscan.png`;
  const postText = `${apps.length} Apparitions revealed from ${int(data.purged.length)} purged ${name}. Every purge on ZScan:`;
  const makePoster = () => {
    const e = stage.current;
    if (!e) return Promise.resolve(null);
    return poster({
      title,
      subtitle,
      tagline: "zscan.cash · Zcash NFT data",
      legend: [
        { color: STAGE.text, label: "Apparition", box: true, ring: true },
        { color: "rgba(255,255,255,0.45)", label: "the 26 snarks purged for it" },
      ],
      render: (ctx, w, h) => e.renderTo(ctx, w, h),
    });
  };
  const onPng = async () => {
    setBusy(true);
    const b = await makePoster();
    setBusy(false);
    if (b) download(b, file);
  };
  const onX = async () => {
    setBusy(true);
    const b = await makePoster();
    setBusy(false);
    if (!b) return;
    const url = window.location.href;
    if (window.matchMedia("(pointer: coarse)").matches && (await shareFile(b, file, postText, url))) return;
    download(b, file);
    tweet(postText, url);
    setNote("Image downloaded: attach it to your post.");
  };

  // ---- Tooltip --------------------------------------------------------------------------------
  const tip = (() => {
    if (!hover) return null;
    const c = cells[hover.hit.cell];
    const a = apps[hover.hit.cell];
    if (hover.hit.ring != null) {
      const p = bySlot.get(c.slot)?.[hover.hit.ring];
      if (!p) return null;
      return (
        <>
          <p className="font-medium">#{p.item}</p>
          <p className="text-muted">Rank {int(p.rank)} · purged for {a.name}</p>
          {p.last != null && <p className="text-muted">Last sale {zec(p.last, 2)} ZEC</p>}
        </>
      );
    }
    const m = median((bySlot.get(c.slot) ?? []).map((p) => p.rank).filter((r): r is number => r != null));
    return (
      <>
        <p className="font-medium">{a.name}</p>
        <p className="text-muted">
          #{a.item} · {Number.isFinite(c.at) ? `${hhmm(c.at)} UTC` : "time unknown"}
        </p>
        <p className="text-muted">{c.ring.length} purged · median rank {int(m)}</p>
      </>
    );
  })();

  const s = sel >= 0 ? apps[sel] : null;
  const sPurged = s ? (bySlot.get(s.slot) ?? []) : [];

  return (
    <div className="space-y-4">
      <section className="card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold">The purge, replayed</h2>
            <p className="num text-xs text-muted">
              {playing
                ? `${new Date(clock.t).toISOString().slice(0, 10)} ${hhmm(clock.t)} UTC · ${clock.n} / ${apps.length} revealed · ${int(purgedSoFar)} purged`
                : "Each Apparition with the 26 snarks purged to reveal it. Hover a snark, click an Apparition."}
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5 text-xs">
            <button type="button" onClick={() => (playing ? stage.current?.finish() : stage.current?.play())} className="rounded-md border border-border px-2.5 py-1 hover:border-link hover:text-link">
              {playing ? "Skip" : "Replay"}
            </button>
            <button type="button" onClick={onPng} disabled={busy} className="rounded-md border border-border px-2.5 py-1 hover:border-link hover:text-link disabled:opacity-50">
              Download PNG
            </button>
            <button type="button" onClick={onX} disabled={busy} className="rounded-md border border-border px-2.5 py-1 hover:border-link hover:text-link disabled:opacity-50">
              Share on 𝕏
            </button>
          </div>
        </div>
        <div ref={box} className="relative" style={{ background: STAGE.bg }}>
          <canvas ref={canvas} className="block w-full touch-manipulation" aria-label={`${apps.length} Apparitions, each with the 26 snarks purged for it`} />
          {hover && tip && (
            <div
              className="pointer-events-none absolute z-10 max-w-56 rounded-md border border-border bg-surface px-2.5 py-1.5 text-xs shadow-lg"
              style={{ left: Math.max(0, Math.min(hover.x + 14, hover.w - 230)), top: hover.y + 14 }}
            >
              {tip}
            </div>
          )}
        </div>
        {note && <p className="border-t border-border px-4 py-2 text-xs text-muted">{note}</p>}
      </section>

      {s && (
        <section className="card p-4">
          <div className="flex flex-col gap-4 sm:flex-row">
            <a href={itemHref(s.item)} className="shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={art(s.item, s.slot)} alt={s.name} width={180} height={180} className="rounded-md bg-black [image-rendering:pixelated]" />
            </a>
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-base font-semibold">{s.name}</h3>
                  <p className="text-xs text-muted">
                    <Link href={itemHref(s.item)} className="text-link hover:underline">
                      #{s.item}
                    </Link>{" "}
                    · revealed {s.unlocked_at ? `${s.unlocked_at.slice(0, 10)} ${hhmm(Date.parse(s.unlocked_at))} UTC` : "—"}
                    {s.ask != null && ` · listed ${zec(s.ask, 2)} ZEC`}
                    {s.last != null && ` · last sale ${zec(s.last, 2)} ZEC`}
                  </p>
                </div>
                <button type="button" onClick={() => setSel(-1)} className="text-xs text-muted hover:text-text" aria-label="Close">
                  ✕
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5 text-xs">
                {s.traits
                  .filter((t) => t.value !== "None")
                  .map((t) => (
                    <span key={t.trait_type} className="rounded-md border border-border px-2 py-0.5">
                      <span className="text-muted">{t.trait_type}</span> {t.value}
                    </span>
                  ))}
              </div>
              <p className="pt-1 text-xs font-medium text-muted">
                Purged for it, rarest first · median rank {int(median(sPurged.map((p) => p.rank).filter((r): r is number => r != null)))}
              </p>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(52px,1fr))] gap-1.5">
                {sPurged.map((p) => (
                  <Link key={p.item} href={itemHref(p.item)} title={`#${p.item} · rank ${int(p.rank)}`} className="group text-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={art(p.item)} alt={`#${p.item}`} loading="lazy" className="aspect-square w-full rounded bg-black opacity-80 [image-rendering:pixelated] group-hover:opacity-100" />
                    <span className="num block text-[10px] text-muted">#{p.item}</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

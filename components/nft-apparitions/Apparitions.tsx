"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { download, poster, shareFile, tweet } from "@/components/nft-map/share";
import { STAGE } from "@/components/nft-map/draw";
import { Stat } from "@/components/ui";
import { int, pct, zec } from "@/lib/format";
import type { Apparitions as Data, PurgedItem } from "@/lib/types";
import { FusionStage, hhmm, type FusionCell, type Hit } from "./fusion";

/** The collection map's atlas: item `n` at slot `n - 1`, 100 per row. */
const ATLAS_COLS = 100;
const ATLAS_CELL = 32;
/** Rarity histogram: ranks in bins of this many. */
const BIN = 500;

const median = (xs: number[]) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

export function Apparitions({ slug, name, data }: { slug: string; name: string; data: Data }) {
  const enc = encodeURIComponent(slug);
  // `ap` keeps browsers from showing a picture cached before the item became an Apparition.
  const art = (item: string, slot?: number) => `/v1/collections/${enc}/items/${item}/image${slot ? `?ap=${slot}` : ""}`;
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

      <div className="grid gap-4 lg:grid-cols-2">
        <Timeline cells={cells} names={apps.map((a) => a.name)} />
        <RankHistogram ranks={ranks} minted={minted} median={purgedMedian} commonHalf={commonHalf} />
      </div>

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

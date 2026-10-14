"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { STAGE } from "@/components/nft-map/draw";
import { int } from "@/lib/format";
import type { Apparition, PurgedItem } from "@/lib/types";
import { hhmm } from "./fusion";

/** Each Apparition next to the treasury snark it was before: a wipe to drag, and all 26 pairs. */
export function BeforeAfter({ slug, apps, bySlot }: { slug: string; apps: Apparition[]; bySlot: Map<number, PurgedItem[]> }) {
  const enc = encodeURIComponent(slug);
  const after = (a: Apparition) => `/v1/collections/${enc}/items/${a.item}/image?ap=${a.slot}`;
  const before = (a: Apparition) => `/v1/collections/${enc}/items/${a.item}/image?before=1`;
  const [idx, setIdx] = useState(0);
  const [cut, setCut] = useState(50);
  const [dragging, setDragging] = useState(false);
  const frame = useRef<HTMLDivElement>(null);
  const a = apps[idx];
  const ps = bySlot.get(a.slot) ?? [];

  // A sweep each time an Apparition is shown: all before, then all after, then halfway.
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const t0 = performance.now();
    const step = (now: number) => {
      const t = (now - t0) / 2200;
      // The "after" side covers from `cut` rightwards: 100 shows the snark, 0 the Apparition.
      setCut(t < 0.5 ? 100 - 100 * ease(t * 2) : 50 * ease(Math.min(1, (t - 0.5) * 2)));
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [idx]);

  const move = (clientX: number) => {
    const r = frame.current?.getBoundingClientRect();
    if (r) setCut(Math.max(0, Math.min(100, ((clientX - r.left) / r.width) * 100)));
  };

  return (
    <div className="space-y-4">
      <section className="card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold">Before and after</h2>
            <p className="text-xs text-muted">Each Apparition was a treasury snark. Drag across the picture to see what it was.</p>
          </div>
          <div className="flex gap-1.5 text-xs">
            <button type="button" onClick={() => setIdx(Math.max(0, idx - 1))} disabled={idx === 0} className="rounded-md border border-border px-2.5 py-1 hover:border-link hover:text-link disabled:opacity-40" aria-label="Previous Apparition">
              ←
            </button>
            <button type="button" onClick={() => setIdx(Math.min(apps.length - 1, idx + 1))} disabled={idx === apps.length - 1} className="rounded-md border border-border px-2.5 py-1 hover:border-link hover:text-link disabled:opacity-40" aria-label="Next Apparition">
              →
            </button>
          </div>
        </div>
        <div className="flex flex-col items-center gap-4 p-4 sm:flex-row sm:items-center sm:justify-center sm:gap-8" style={{ background: STAGE.bg }}>
          <div
            ref={frame}
            className="relative aspect-square w-full max-w-[440px] cursor-ew-resize touch-none select-none overflow-hidden rounded-md"
            onPointerDown={(e) => {
              setDragging(true);
              e.currentTarget.setPointerCapture(e.pointerId);
              move(e.clientX);
            }}
            onPointerMove={(e) => dragging && move(e.clientX)}
            onPointerUp={() => setDragging(false)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={before(a)} alt={`#${a.item} before`} draggable={false} className="absolute inset-0 size-full [image-rendering:pixelated]" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={after(a)}
              alt={a.name}
              draggable={false}
              className="absolute inset-0 size-full [image-rendering:pixelated]"
              style={{ clipPath: `inset(0 0 0 ${cut}%)` }}
            />
            <div className="pointer-events-none absolute inset-y-0 w-0.5" style={{ left: `${cut}%`, background: STAGE.text }} />
            <div
              className="pointer-events-none absolute top-1/2 flex size-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-xs font-bold"
              style={{ left: `${cut}%`, background: STAGE.text, color: STAGE.bg }}
            >
              ⇆
            </div>
            <span className="pointer-events-none absolute left-2 top-2 rounded px-1.5 py-0.5 text-[10px] font-medium" style={{ background: "rgba(0,0,0,0.6)", color: STAGE.text }}>
              Before
            </span>
            <span className="pointer-events-none absolute right-2 top-2 rounded px-1.5 py-0.5 text-[10px] font-medium" style={{ background: "rgba(0,0,0,0.6)", color: STAGE.text }}>
              After
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round(cut)}
            onChange={(e) => setCut(Number(e.target.value))}
            aria-label="Before and after"
            className="sr-only"
          />
          <div className="w-full max-w-xs space-y-2 text-sm" style={{ color: STAGE.muted }}>
            <p className="text-lg font-semibold" style={{ color: STAGE.text }}>
              {a.name}
            </p>
            <p>
              Treasury snark{" "}
              <Link href={`/collection/${enc}/item/${a.item}`} className="text-link hover:underline">
                #{a.item}
              </Link>
              , transformed {a.unlocked_at ? `${a.unlocked_at.slice(0, 10)} at ${hhmm(Date.parse(a.unlocked_at))} UTC` : ""} when a holder purged {ps.length} snarks.
            </p>
            <p className="num text-xs">
              Purged ranks {int(Math.min(...ps.map((p) => p.rank ?? Infinity)))}–{int(Math.max(...ps.map((p) => p.rank ?? 0)))}
            </p>
            <div className="flex flex-wrap gap-1 pt-1 text-xs">
              {a.traits
                .filter((t) => t.value !== "None")
                .map((t) => (
                  <span key={t.trait_type} className="rounded border px-1.5 py-0.5" style={{ borderColor: "rgba(255,255,255,0.15)" }}>
                    {t.trait_type} <span style={{ color: STAGE.text }}>{t.value}</span>
                  </span>
                ))}
            </div>
          </div>
        </div>
      </section>

      <section className="card p-4">
        <h3 className="text-sm font-semibold">All {apps.length}, before and after</h3>
        <p className="mb-3 text-xs text-muted">Hover a pair to see the snark it was. Click to open it above.</p>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(88px,1fr))] gap-2">
          {apps.map((x, i) => (
            <button key={x.slot} type="button" onClick={() => setIdx(i)} className={`group relative overflow-hidden rounded-md border-2 ${i === idx ? "border-link" : "border-transparent"}`} title={`${x.name} · #${x.item}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={after(x)} alt={x.name} loading="lazy" className="block aspect-square w-full bg-black [image-rendering:pixelated]" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={before(x)} alt="" loading="lazy" className="absolute inset-0 aspect-square w-full opacity-0 transition-opacity duration-300 [image-rendering:pixelated] group-hover:opacity-100" />
              <span className="num absolute bottom-0.5 left-1 text-[10px] font-semibold text-white [text-shadow:0_1px_2px_#000]">{String(x.slot).padStart(2, "0")}</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

const ease = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));

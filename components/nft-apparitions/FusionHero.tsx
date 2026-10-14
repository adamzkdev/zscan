"use client";

import { useEffect, useRef, useState } from "react";
import { download, poster } from "@/components/nft-map/share";
import { STAGE } from "@/components/nft-map/draw";
import { int } from "@/lib/format";
import type { Apparition, PurgedItem } from "@/lib/types";
import { hhmm } from "./fusion";
import { build, DONE, geometry, ParticleStage, type Geometry } from "./particles";
import { PIX, pixels } from "./pixels";

type Loaded = { app: Uint8ClampedArray; snarks: Uint8ClampedArray[] };

/** How long a formed Apparition stays before the next one, when playing all. */
const HOLD_MS = 2600;

/** One Apparition at a time: its 26 snarks shatter into pixels that spiral in and become it. */
export function FusionHero({ slug, apps, bySlot }: { slug: string; apps: Apparition[]; bySlot: Map<number, PurgedItem[]> }) {
  const enc = encodeURIComponent(slug);
  const art = (item: string, slot?: number) => `/v1/collections/${enc}/items/${item}/image${slot ? `?ap=${slot}` : ""}`;

  const canvas = useRef<HTMLCanvasElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const stage = useRef<ParticleStage | null>(null);
  const cache = useRef(new Map<number, Promise<Loaded>>());
  const size = useRef({ w: 0, h: 0 });
  const [idx, setIdx] = useState(0);
  const [auto, setAuto] = useState(false);
  const [phase, setPhase] = useState<"loading" | "playing" | "done" | "error">("loading");
  const [geo, setGeo] = useState<Geometry | null>(null);
  const [seen, setSeen] = useState(false);
  const [noGl, setNoGl] = useState(false);
  const [run, setRun] = useState(0);

  const a = apps[idx];
  const purged = bySlot.get(a.slot) ?? [];

  const load = (i: number): Promise<Loaded> => {
    const ap = apps[i];
    let p = cache.current.get(ap.slot);
    if (!p) {
      const ps = bySlot.get(ap.slot) ?? [];
      p = Promise.all([pixels(art(ap.item, ap.slot)), Promise.all(ps.map((x) => pixels(art(x.item))))]).then(([app, snarks]) => ({ app, snarks }));
      p.catch(() => cache.current.delete(ap.slot));
      cache.current.set(ap.slot, p);
    }
    return p;
  };

  // The WebGL stage, sized to the card.
  useEffect(() => {
    const c = canvas.current;
    const b = box.current;
    if (!c || !b) return;
    if (!ParticleStage.supported(c)) {
      setNoGl(true);
      return;
    }
    const s = new ParticleStage(c, () => setPhase("done"));
    stage.current = s;
    const fit = () => {
      const w = b.clientWidth;
      const h = Math.round(w < 640 ? w * 1.15 : Math.min(620, w * 0.5));
      size.current = { w, h };
      s.resize(w, h);
      setRun((r) => r + 1);
    };
    const ro = new ResizeObserver(fit);
    ro.observe(b);
    fit();
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setSeen(true);
          io.disconnect();
        }
      },
      { threshold: 0.3 },
    );
    io.observe(b);
    return () => {
      ro.disconnect();
      io.disconnect();
      s.destroy();
      stage.current = null;
    };
  }, []);

  // Build and play the current Apparition (again on resize, then without replaying).
  const played = useRef(-1);
  useEffect(() => {
    const s = stage.current;
    if (!s || !seen || !size.current.w) return;
    let live = true;
    const { w, h } = size.current;
    const ap = apps[idx];
    const g = geometry(w, h, (bySlot.get(ap.slot) ?? []).length || 26);
    load(idx)
      .then((d) => {
        if (!live) return;
        s.set(build(d.app, d.snarks, g, ap.slot), g);
        setGeo(g);
        const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        if (played.current === idx || still) {
          s.show(DONE);
          setPhase("done");
        } else {
          played.current = idx;
          setPhase("playing");
          s.play();
        }
        // Have the next one ready.
        if (idx + 1 < apps.length) load(idx + 1).catch(() => {});
      })
      .catch(() => live && setPhase("error"));
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, seen, run]);

  // Playing all: the next one after a pause.
  useEffect(() => {
    if (!auto || phase !== "done") return;
    const t = setTimeout(() => {
      if (idx + 1 < apps.length) setIdx(idx + 1);
      else setAuto(false);
    }, HOLD_MS);
    return () => clearTimeout(t);
  }, [auto, phase, idx, apps.length]);

  const go = (i: number) => {
    played.current = -1;
    setPhase("loading");
    setIdx(i);
    setRun((r) => r + 1);
  };
  const replay = () => go(idx);

  const onPng = async () => {
    const c = canvas.current;
    if (!c) return;
    const b = await poster({
      title: `${a.name} · born from ${purged.length} zkSNARKs`,
      subtitle: `Purged ${a.unlocked_at ? `${a.unlocked_at.slice(0, 10)} ${hhmm(Date.parse(a.unlocked_at))} UTC` : ""} · ${purged.map((p) => `#${p.item}`).slice(0, 8).join(" ")}…`,
      tagline: "zscan.cash · Zcash NFT data",
      legend: [],
      render: (ctx, w, h) => {
        const k = Math.min(w / c.width, h / c.height);
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(c, (w - c.width * k) / 2, (h - c.height * k) / 2, c.width * k, c.height * k);
      },
    });
    if (b) download(b, `${slug}-apparition-${String(a.slot).padStart(2, "0")}-zscan.png`);
  };

  const ranks = purged.map((p) => p.rank).filter((r): r is number => r != null);
  const side = geo ? geo.pa * PIX : 0;

  return (
    <section className="card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold">The fusion</h2>
          <p className="text-xs text-muted">Every pixel of {a.name} is a pixel of one of the {purged.length} snarks purged for it, picked for its colour.</p>
        </div>
        <div className="flex flex-wrap gap-1.5 text-xs">
          <button type="button" onClick={() => go(Math.max(0, idx - 1))} disabled={idx === 0} className="rounded-md border border-border px-2.5 py-1 hover:border-link hover:text-link disabled:opacity-40" aria-label="Previous Apparition">
            ←
          </button>
          <button type="button" onClick={() => go(Math.min(apps.length - 1, idx + 1))} disabled={idx === apps.length - 1} className="rounded-md border border-border px-2.5 py-1 hover:border-link hover:text-link disabled:opacity-40" aria-label="Next Apparition">
            →
          </button>
          <button type="button" onClick={replay} className="rounded-md border border-border px-2.5 py-1 hover:border-link hover:text-link">
            Replay
          </button>
          <button
            type="button"
            onClick={() => {
              if (auto) setAuto(false);
              else {
                setAuto(true);
                if (phase === "done") go(idx + 1 < apps.length ? idx + 1 : 0);
              }
            }}
            className={`rounded-md border px-2.5 py-1 ${auto ? "border-link bg-link text-white" : "border-border hover:border-link hover:text-link"}`}
          >
            {auto ? "Stop" : `Play all ${apps.length}`}
          </button>
          <button type="button" onClick={onPng} disabled={phase !== "done"} className="rounded-md border border-border px-2.5 py-1 hover:border-link hover:text-link disabled:opacity-50">
            Download PNG
          </button>
        </div>
      </div>

      <div ref={box} className="relative" style={{ background: STAGE.bg }}>
        <canvas ref={canvas} className={`block w-full ${noGl ? "hidden" : ""}`} aria-label={`${purged.length} snarks shattering into ${a.name}`} />
        {/* The art itself fades in over the particles once they've landed: same pixels, its own texture. */}
        {geo && !noGl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={art(a.item, a.slot)}
            alt=""
            className="pointer-events-none absolute [image-rendering:pixelated] transition-opacity duration-700"
            style={{ left: geo.ax, top: geo.ay, width: side, height: side, opacity: phase === "done" ? 1 : 0 }}
          />
        )}
        {noGl && (
          <div className="flex justify-center p-8">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={art(a.item, a.slot)} alt={a.name} width={260} height={260} className="[image-rendering:pixelated]" />
          </div>
        )}
        {(phase === "loading" || phase === "error") && !noGl && (
          <p className="absolute inset-x-0 top-1/2 -translate-y-1/2 text-center text-xs" style={{ color: STAGE.muted }}>
            {phase === "error" ? "Couldn't load the pictures." : `Gathering the ${purged.length} snarks…`}
          </p>
        )}
        <div className="px-4 pb-3 text-xs sm:pointer-events-none sm:absolute sm:bottom-3 sm:left-4 sm:p-0" style={{ color: STAGE.muted }}>
          <p className="text-base font-semibold" style={{ color: STAGE.text }}>
            {a.name}
          </p>
          <p className="num">
            #{a.item} · {a.unlocked_at ? `${hhmm(Date.parse(a.unlocked_at))} UTC` : ""} · {purged.length} purged, ranks {int(Math.min(...ranks))}–{int(Math.max(...ranks))}
          </p>
        </div>
      </div>

      <div className="flex gap-1 overflow-x-auto border-t border-border px-3 py-2 [scrollbar-width:thin]" role="tablist" aria-label="Apparitions">
        {apps.map((x, i) => (
          <button
            key={x.slot}
            type="button"
            role="tab"
            aria-selected={i === idx}
            title={x.name}
            onClick={() => {
              setAuto(false);
              go(i);
            }}
            className={`shrink-0 rounded border-2 ${i === idx ? "border-link" : "border-transparent opacity-60 hover:opacity-100"}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={art(x.item, x.slot)} alt={x.name} width={36} height={36} loading="lazy" className="block rounded-sm bg-black [image-rendering:pixelated]" />
          </button>
        ))}
      </div>
    </section>
  );
}

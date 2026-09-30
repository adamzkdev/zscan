"use client";

import { useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { int, zec } from "@/lib/format";
import type { CollectionMap } from "@/lib/types";
import { premiumColor, STAGE } from "./draw";
import { type Hover, MapEngine } from "./engine";
import { decode, type Item, layout, type Order, type Show, type SizeBy, type View } from "./layouts";
import { download, poster, shareFile, tweet } from "./share";

export interface MapParams {
  map?: string;
  order?: string;
  by?: string;
  size?: string;
  show?: string;
  match?: string;
}

const VIEWS: [View, string][] = [
  ["mosaic", "Mosaic"],
  ["traits", "Trait bubbles"],
  ["price", "Price × rarity"],
  ["sales", "Sales bubbles"],
];
const ORDERS: [Order, string][] = [
  ["id", "Number"],
  ["rank", "Rarity"],
  ["ask", "Price"],
  ["last", "Last sale"],
];
const SIZES: [SizeBy, string][] = [
  ["last", "Last sale"],
  ["volume", "Volume on record"],
];
const SHOWS: [Show, string][] = [
  ["", "All"],
  ["listed", "Listed"],
  ["bids", "Has bid"],
  ["sold", "Sold before"],
  ["deals", "Deals"],
];

// Same look as the collection page's chips (components/NftMarket.tsx), as buttons.
const chip = (on: boolean) =>
  `rounded-md border px-2 py-0.5 ${on ? "border-link bg-link text-white" : "border-border text-text hover:text-link"}`;
const pick = <T extends string>(list: [T, string][], v: string | undefined, fallback: T): T => (list.some(([k]) => k === v) ? (v as T) : fallback);
export function NftMap({ slug, name, initial }: { slug: string; name: string; initial: MapParams }) {
  const router = useRouter();
  const [data, setData] = useState<CollectionMap | null>(null);
  const [failed, setFailed] = useState(false);
  const [atlas, setAtlas] = useState<HTMLImageElement | null>(null);
  const [view, setView] = useState<View>(pick(VIEWS, initial.map, "mosaic"));
  const [order, setOrder] = useState<Order>(pick(ORDERS, initial.order, "id"));
  const [size, setSize] = useState<SizeBy>(pick(SIZES, initial.size, "last"));
  const [show, setShow] = useState<Show>(pick(SHOWS, initial.show, ""));
  const [byName, setByName] = useState(initial.by ?? "");
  const [match, setMatch] = useState(initial.match ?? "");
  const [find, setFind] = useState("");
  const [note, setNote] = useState("");
  const [hover, setHover] = useState<Hover>({ i: -1, group: -1, pinned: false });
  const [busy, setBusy] = useState(false);
  // The mosaic takes the frame's shape; rounded so small resizes don't reshuffle it.
  const [aspect, setAspect] = useState(1.6);

  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const card = useRef<HTMLDivElement>(null);
  const engine = useRef<MapEngine | null>(null);
  const openItem = useRef<(i: number) => void>(() => {});
  // An item searched for while the view hid it, found once the mosaic is laid out.
  const pendingFind = useRef(-1);

  useEffect(() => {
    let live = true;
    fetch(`/v1/collections/${encodeURIComponent(slug)}/map`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((m: CollectionMap) => {
        if (!live) return;
        setData(m);
        const img = new Image();
        img.onload = () => live && setAtlas(img);
        img.src = m.atlas.url;
      })
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
    };
  }, [slug]);

  useEffect(() => {
    const e = new MapEngine(canvas.current!, card.current!, {
      imageUrl: (id) => `/v1/collections/${encodeURIComponent(slug)}/items/${id}/image`,
      onHover: setHover,
      onOpen: (i) => openItem.current(i),
    });
    engine.current = e;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (height) setAspect(Math.round((width / height) * 4) / 4);
    });
    ro.observe(wrap.current!);
    return () => {
      ro.disconnect();
      e.destroy();
      engine.current = null;
    };
  }, [slug]);

  const items: Item[] = useMemo(() => (data ? decode(data) : []), [data]);
  useEffect(() => {
    openItem.current = (i) => router.push(`/collection/${encodeURIComponent(slug)}/item/${items[i].id}`);
  }, [router, slug, items]);

  const types = useMemo(() => (data?.traits ?? []).map((t, n) => [n, t] as const).filter(([, t]) => t.values.length > 1), [data]);
  // By default, the trait whose number of values makes the most readable set of bubbles.
  const byDefault = types.reduce<number | null>((best, [n, t]) => (best == null || Math.abs(t.values.length - 20) < Math.abs(data!.traits[best].values.length - 20) ? n : best), null);
  const by = types.find(([, t]) => t.trait_type === byName)?.[0] ?? byDefault ?? 0;
  const matchPair = useMemo(() => {
    const [t, ...v] = match.split(":");
    const ti = data?.traits.findIndex((x) => x.trait_type === t) ?? -1;
    const vi = ti >= 0 ? data!.traits[ti].values.indexOf(v.join(":")) : -1;
    return vi >= 0 ? ([ti, vi] as const) : null;
  }, [data, match]);

  const shape = view === "mosaic" ? aspect : 1;
  const lay = useMemo(() => (data ? layout(items, data, view, { order, by, size, aspect: shape }) : null), [items, data, view, order, by, size, shape]);

  const matches = useMemo(() => {
    if (!lay || (!show && !matchPair)) return null;
    const m = new Uint8Array(items.length);
    let n = 0;
    items.forEach((it, i) => {
      const s =
        show === "listed" ? it.ask != null : show === "bids" ? it.bid != null : show === "sold" ? it.last != null : show === "deals" ? lay.deals[i] === 1 : true;
      const t = !matchPair || it.traits[matchPair[0]] === matchPair[1];
      if (s && t) {
        m[i] = 1;
        n++;
      }
    });
    return { m, n };
  }, [lay, items, show, matchPair]);
  const visible = useMemo(() => (lay ? lay.s.reduce((n, s) => n + (s ? 1 : 0), 0) : 0), [lay]);

  // ---- Feeding the canvas -------------------------------------------------------------------
  useEffect(() => {
    engine.current?.update({ items, cell: data?.atlas.cell ?? 32, cols: data?.atlas.cols ?? 100, floor: data?.floor ?? null });
  }, [items, data]);
  useEffect(() => {
    engine.current?.update({ atlas, match: matches?.m ?? null, sizeBy: size });
  }, [atlas, matches, size]);
  useEffect(() => {
    if (!lay) return;
    engine.current?.setLayout(lay);
    if (pendingFind.current >= 0 && lay.s[pendingFind.current]) {
      engine.current?.goTo(pendingFind.current);
      pendingFind.current = -1;
    }
  }, [lay]);
  // The card's height is only known once its new content rendered.
  useLayoutEffect(() => {
    if (hover.i >= 0 || hover.group >= 0) engine.current?.placeCard();
  }, [hover]);

  const onFind = (e: React.FormEvent) => {
    e.preventDefault();
    const q = find.replace("#", "").trim();
    const i = items.findIndex((it) => it.id === Number(q));
    if (!q || i < 0) {
      setNote(`No item #${q}`);
      return;
    }
    setNote("");
    // An item the current view hides is found on the mosaic.
    if (!engine.current?.goTo(i)) {
      pendingFind.current = i;
      setView("mosaic");
    }
  };

  // ---- URL ----------------------------------------------------------------------------------
  const byLabel = data?.traits[by]?.trait_type ?? "";
  useEffect(() => {
    const u = new URL(window.location.href);
    for (const k of ["map", "order", "by", "size", "show", "match"]) u.searchParams.delete(k);
    u.searchParams.set("tab", "map");
    if (view !== "mosaic") u.searchParams.set("map", view);
    if (view === "mosaic" && order !== "id") u.searchParams.set("order", order);
    if (view === "traits" && byLabel) u.searchParams.set("by", byLabel);
    if (view === "sales" && size !== "last") u.searchParams.set("size", size);
    if (show) u.searchParams.set("show", show);
    if (match) u.searchParams.set("match", match);
    if (u.href !== window.location.href) window.history.replaceState(window.history.state, "", u);
  }, [view, order, byLabel, size, show, match]);

  // ---- Words for the legend, the poster and the post ----------------------------------------
  const viewLabel = VIEWS.find(([v]) => v === view)![1];
  const highlight = [show && SHOWS.find(([s]) => s === show)![1], matchPair && match.replace(":", ": ")].filter(Boolean).join(" · ");
  const subtitle =
    view === "mosaic"
      ? `All ${int(items.length)} items, by ${ORDERS.find(([o]) => o === order)![1].toLowerCase()}`
      : view === "traits"
        ? `${int(items.length)} items grouped by ${byLabel}`
        : view === "price"
          ? `${int(visible)} listed items: asking price against rarity rank`
          : `${int(visible)} items that sold, sized by ${size === "volume" ? "volume on record" : "last sale"}`;
  const fullSubtitle = `${subtitle}${highlight ? ` · highlighted: ${highlight} (${int(matches?.n ?? 0)})` : ""}`;
  const legend: { color: string; label: string; ring?: boolean }[] =
    view === "traits"
      ? [
          { color: "rgba(255,255,255,0.28)", label: "Trait floor < 1.5× floor", ring: true },
          { color: STAGE.link, label: "1.5–4×", ring: true },
          { color: STAGE.accent, label: "≥ 4× floor", ring: true },
          { color: STAGE.faint, label: "none listed", ring: true },
        ]
      : view === "price"
        ? [
            { color: STAGE.accent, label: "Median sale (7 days) of each rarity band" },
            { color: STAGE.good, label: `Deal: ${Math.round((data?.deal_discount ?? 0.1) * 100)}%+ under its band's median`, ring: true },
          ]
        : view === "sales" && lay?.sizeCap
          ? [{ color: "rgba(255,255,255,0.35)", label: `Bubble area = ${size === "volume" ? "volume on record" : "last sale"}, largest from ${zec(lay.sizeCap, 2)} ZEC`, ring: true }]
          : [];

  const makePoster = () => {
    const e = engine.current;
    if (!e || !lay) return Promise.resolve(null);
    return poster({ title: `${name} · ${viewLabel}`, subtitle: fullSubtitle, legend, render: (ctx, w, h) => e.renderTo(ctx, w, h) });
  };
  const file = `${slug}-${view}-zscan.png`;
  const postText = `${name} on Zcash, ${subtitle.charAt(0).toLowerCase()}${subtitle.slice(1)}${data?.floor != null ? `. Floor ${zec(data.floor, 2)} ZEC` : ""}. Mapped on ZScan:`;
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
    // Phones: the share sheet can post the picture itself. Desktop: download it to attach.
    if (window.matchMedia("(pointer: coarse)").matches && (await shareFile(b, file, postText, url))) return;
    download(b, file);
    tweet(postText, url);
    setNote("Image downloaded: attach it to your post.");
  };
  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setNote("Link copied.");
    } catch {
      setNote("Couldn't copy the link.");
    }
  };

  // ---- Hover card ---------------------------------------------------------------------------
  const it = hover.i >= 0 ? items[hover.i] : null;
  const grp = hover.group >= 0 && lay ? lay.groups[hover.group] : null;

  if (failed)
    return (
      <div className="card px-4 py-10 text-center text-sm text-muted">The map isn&apos;t available right now.</div>
    );

  return (
    <section className="card overflow-hidden">
      <div className="space-y-2.5 border-b border-border px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-1 rounded-lg border border-border p-0.5 text-sm" role="tablist" aria-label="Map view">
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
          <div className="flex flex-wrap gap-1.5 text-xs">
            <button type="button" onClick={onPng} disabled={!lay || busy} className="rounded-md border border-border px-2.5 py-1 hover:border-link hover:text-link disabled:opacity-50">
              Download PNG
            </button>
            <button type="button" onClick={onX} disabled={!lay || busy} className="rounded-md border border-border px-2.5 py-1 hover:border-link hover:text-link disabled:opacity-50">
              Share on 𝕏
            </button>
            <button type="button" onClick={onCopy} className="rounded-md border border-border px-2.5 py-1 hover:border-link hover:text-link">
              Copy link
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
          {view === "mosaic" && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-muted">Order</span>
              {ORDERS.map(([o, label]) => (
                <button key={o} type="button" onClick={() => setOrder(o)} className={chip(order === o)}>
                  {label}
                </button>
              ))}
            </div>
          )}
          {view === "traits" && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-muted">Group by</span>
              {types.map(([n, t]) => (
                <button key={n} type="button" onClick={() => setByName(t.trait_type)} className={chip(by === n)}>
                  {t.trait_type}
                </button>
              ))}
            </div>
          )}
          {view === "sales" && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-muted">Size</span>
              {SIZES.map(([s, label]) => (
                <button key={s} type="button" onClick={() => setSize(s)} className={chip(size === s)}>
                  {label}
                </button>
              ))}
            </div>
          )}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-muted">Highlight</span>
            {SHOWS.filter(([s]) => s !== "deals" || view === "price").map(([s, label]) => (
              <button key={s || "all"} type="button" onClick={() => setShow(s)} className={chip(show === s)}>
                {label}
              </button>
            ))}
            <select
              value={matchPair ? match : ""}
              onChange={(e) => setMatch(e.target.value)}
              aria-label="Highlight a trait"
              className="max-w-44 rounded-md border border-border bg-surface px-1.5 py-0.5"
            >
              <option value="">Any trait</option>
              {types.map(([n, t]) => (
                <optgroup key={n} label={t.trait_type}>
                  {t.values.map((v) => (
                    <option key={v} value={`${t.trait_type}:${v}`}>
                      {v}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
          <form onSubmit={onFind} className="flex items-center gap-1">
            <input
              value={find}
              onChange={(e) => setFind(e.target.value)}
              inputMode="numeric"
              placeholder="Find #"
              aria-label="Find an item by number"
              className="w-20 rounded-md border border-border bg-surface px-1.5 py-0.5"
            />
            <button type="submit" className="rounded-md border border-border px-2 py-0.5 text-link hover:bg-surface-2">
              Go
            </button>
          </form>
        </div>
      </div>

      <div ref={wrap} className="relative h-[70vh] min-h-[420px] w-full select-none overflow-hidden" style={{ background: STAGE.bg }}>
        <canvas ref={canvas} className="absolute inset-0 size-full cursor-grab touch-none" aria-label={`${name}: ${fullSubtitle}`} role="img" />
        {!lay && <div className="absolute inset-0 flex items-center justify-center text-sm text-[#9aa0a6]">Loading every item…</div>}
        {lay && !atlas && <div className="absolute left-3 top-3 rounded bg-black/60 px-2 py-1 text-xs text-[#9aa0a6]">Loading pictures…</div>}

        <div
          ref={card}
          className={`pointer-events-none absolute left-0 top-0 w-60 rounded-lg border border-white/10 bg-[#141518]/95 text-[#e8eaed] shadow-2xl backdrop-blur transition-opacity ${it || grp ? "opacity-100" : "opacity-0"}`}
        >
          {it && (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/v1/collections/${encodeURIComponent(slug)}/items/${it.id}/image`}
                alt=""
                className="aspect-square w-full rounded-t-lg bg-black [image-rendering:pixelated]"
              />
              <div className="space-y-1 p-3 text-xs">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-sm font-semibold">
                    {name} #{it.id}
                  </span>
                  {it.rank != null && <span className="text-[#9aa0a6]">Rarity #{int(it.rank)}</span>}
                </div>
                <Line k="Ask" v={it.ask != null ? `${zec(it.ask, 4)} ZEC` : "Not listed"} strong={it.ask != null} />
                {lay?.deals[hover.i] ? <p className="text-[#2fbf9c]">Listed under what its rarity band sold for this week</p> : null}
                <Line k="Top bid" v={it.bid != null ? `${zec(it.bid, 4)} ZEC` : "—"} />
                <Line k="Last sale" v={it.last != null ? `${zec(it.last, 4)} ZEC` : "Never sold"} />
                {it.sales > 0 && <Line k="Sales on record" v={`${it.sales} · ${zec(it.volume, 2)} ZEC`} />}
                {data && lay?.view === "traits" && (
                  <Line k={byLabel} v={data.traits[by].values[it.traits[by]] ?? "None"} />
                )}
                <p className="pt-1 text-[11px] text-[#5f6368]">
                  <span className="pointer-coarse:hidden">Click to open</span>
                  <span className="hidden pointer-coarse:inline">Tap again to open</span>
                </p>
              </div>
            </>
          )}
          {!it && grp && data && (
            <div className="space-y-1 p-3 text-xs">
              <p className="text-[11px] uppercase tracking-wide text-[#9aa0a6]">{byLabel}</p>
              <p className="text-sm font-semibold">{grp.label}</p>
              <Line k="Items" v={`${int(grp.count)} · ${((grp.count / items.length) * 100).toFixed(1)}%`} />
              <Line k="Listed" v={int(grp.listed)} />
              <Line k="Floor" v={grp.floor != null ? `${zec(grp.floor, 4)} ZEC` : "None listed"} strong />
              {grp.floor != null && data.floor ? (
                <p style={{ color: premiumColor(grp, data.floor) }}>{(grp.floor / data.floor).toFixed(1)}× the collection floor</p>
              ) : null}
              <p className="pt-1 text-[11px] text-[#5f6368]">Click to zoom in</p>
            </div>
          )}
        </div>

        <div className="absolute bottom-3 right-3 flex flex-col overflow-hidden rounded-md border border-white/10 bg-black/60 text-[#e8eaed]">
          <button type="button" aria-label="Zoom in" title="Zoom in" onClick={() => engine.current?.zoomBy(1.6)} className="size-8 text-base hover:bg-white/10">
            +
          </button>
          <button type="button" aria-label="Zoom out" title="Zoom out" onClick={() => engine.current?.zoomBy(1 / 1.6)} className="size-8 text-base hover:bg-white/10">
            −
          </button>
          <button type="button" aria-label="Fit" title="Fit" onClick={() => engine.current?.reset()} className="size-8 text-base hover:bg-white/10">
            ⤢
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 border-t border-border px-4 py-2.5 text-xs text-muted">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <span>
            {int(visible)} shown{matches ? ` · ${int(matches.n)} highlighted` : ""}
          </span>
          {legend.map((l) => (
            <span key={l.label} className="inline-flex items-center gap-1.5">
              <span
                className={`inline-block size-3 ${l.ring ? "rounded-full border-2" : "rounded-sm"}`}
                style={l.ring ? { borderColor: l.color } : { background: l.color }}
              />
              {l.label}
            </span>
          ))}
        </div>
        <span>
          {note || (
            <>
              <span className="pointer-coarse:hidden">Scroll to zoom, drag to move, hover for details.</span>
              <span className="hidden pointer-coarse:inline">Pinch to zoom, drag to move, tap for details.</span>
            </>
          )}
        </span>
      </div>
    </section>
  );
}

function Line({ k, v, strong }: { k: string; v: string; strong?: boolean }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-[#9aa0a6]">{k}</span>
      <span className={`num text-right ${strong ? "font-semibold" : ""}`}>{v}</span>
    </div>
  );
}

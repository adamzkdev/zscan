"use client";

import { useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { int, zec } from "@/lib/format";
import type { CollectionMap } from "@/lib/types";
import { premiumColor, STAGE } from "./draw";
import { type Hover, MapEngine } from "./engine";
import { dealFlags, decode, type Item, layout, type Order, type Show, type SizeBy, type View } from "./layouts";
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
  // The half-size atlas arrives first (a quarter of the weight), then the sharp one replaces it.
  const [atlas, setAtlas] = useState<{ img: HTMLImageElement; cell: number } | null>(null);
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
  const under = useRef<HTMLCanvasElement>(null);
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
        let sharp = false;
        const load = (url: string, cell: number, final: boolean) => {
          const img = new Image();
          img.onload = () => {
            if (!live || (!final && sharp)) return;
            if (final) sharp = true;
            setAtlas({ img, cell });
          };
          img.src = url;
        };
        load(m.atlas.preview, m.atlas.cell / 2, false);
        load(m.atlas.url, m.atlas.cell, true);
      })
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
    };
  }, [slug]);

  useEffect(() => {
    const e = new MapEngine(canvas.current!, under.current!, card.current!, {
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

  const deals = useMemo(() => (data ? dealFlags(items, data) : new Uint8Array(0)), [items, data]);
  // How many items carry each trait value, for the rarity shown on the card.
  const traitCounts = useMemo(() => {
    const c = (data?.traits ?? []).map((t) => new Array<number>(t.values.length).fill(0));
    for (const it of items) it.traits.forEach((v, t) => v >= 0 && c[t] && c[t][v]++);
    return c;
  }, [items, data]);

  const matches = useMemo(() => {
    if (!show && !matchPair) return null;
    const m = new Uint8Array(items.length);
    let n = 0;
    items.forEach((it, i) => {
      const s =
        show === "listed" ? it.ask != null : show === "bids" ? it.bid != null : show === "sold" ? it.last != null : show === "deals" ? deals[i] === 1 : true;
      const t = !matchPair || it.traits[matchPair[0]] === matchPair[1];
      if (s && t) {
        m[i] = 1;
        n++;
      }
    });
    return { m, n };
  }, [items, show, matchPair, deals]);

  const shape = view === "mosaic" ? aspect : 1;
  const matchKey = matches ? `${show}|${match}` : "";
  const lay = useMemo(
    () => (data ? layout(items, data, view, { order, by, size, aspect: shape, match: matches?.m ?? null, deals }, matchKey) : null),
    [items, data, view, order, by, size, shape, matches, deals, matchKey],
  );
  const visible = useMemo(() => (lay ? lay.s.reduce((n, s) => n + (s ? 1 : 0), 0) : 0), [lay]);

  // ---- Feeding the canvas -------------------------------------------------------------------
  useEffect(() => {
    engine.current?.update({ items, deals, cols: data?.atlas.cols ?? 100, floor: data?.floor ?? null });
  }, [items, data, deals]);
  useEffect(() => {
    if (atlas) engine.current?.update({ atlas: atlas.img, cell: atlas.cell });
  }, [atlas]);
  useEffect(() => {
    engine.current?.update({ sizeBy: size });
  }, [size]);
  useEffect(() => {
    if (items.length) engine.current?.highlight(matches?.m ?? null);
  }, [items, matches]);
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
          ? `${int(visible)} listings by rarity band: asking prices against what each band sold for this week`
          : `${int(visible)} items that sold, sized by ${size === "volume" ? "volume on record" : "last sale"}`;
  const fullSubtitle = `${subtitle}${highlight ? ` · highlighted: ${highlight} (${int(matches?.n ?? 0)})` : ""}`;
  const legend: { color: string; label: string; ring?: boolean; box?: boolean }[] =
    view === "traits"
      ? [
          { color: "rgba(255,255,255,0.28)", label: "Trait floor < 1.5× floor", ring: true },
          { color: STAGE.link, label: "1.5–4×", ring: true },
          { color: STAGE.accent, label: "≥ 4× floor", ring: true },
          { color: STAGE.faint, label: "none listed", ring: true },
        ]
      : view === "price"
        ? [
            { color: STAGE.accent, label: "What the rarity band sold for this week (median)" },
            { color: STAGE.good, label: `Deal: listed ${Math.round((data?.deal_discount ?? 0.1) * 100)}%+ below that`, ring: true, box: true },
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
  const ref = it?.rank != null ? (data?.bands.find((b) => it.rank! >= b.from_rank && it.rank! <= b.to_rank)?.reference ?? null) : null;
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
            {SHOWS.map(([s, label]) => (
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
        <canvas ref={under} className="absolute inset-0 size-full" aria-hidden />
        <canvas ref={canvas} className="absolute inset-0 size-full cursor-grab touch-none" aria-label={`${name}: ${fullSubtitle}`} role="img" />
        {!lay && <div className="absolute inset-0 flex items-center justify-center text-sm text-[#9aa0a6]">Loading every item…</div>}
        {lay && !atlas && <div className="absolute left-3 top-3 rounded bg-black/60 px-2 py-1 text-xs text-[#9aa0a6]">Loading pictures…</div>}

        <div
          ref={card}
          className={`pointer-events-none absolute left-0 top-0 w-72 rounded-lg border border-white/10 bg-[#141518]/95 text-[#e8eaed] shadow-2xl backdrop-blur transition-opacity ${it || grp ? "opacity-100" : "opacity-0"}`}
        >
          {it && data && (
            <div className="space-y-2.5 p-3 text-xs">
              <div className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/v1/collections/${encodeURIComponent(slug)}/items/${it.id}/image`}
                  alt=""
                  className="size-16 shrink-0 rounded-md bg-black [image-rendering:pixelated]"
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">
                    {name} #{it.id}
                  </p>
                  {it.rank != null && (
                    <p className="text-[#9aa0a6]">
                      Rarity #{int(it.rank)} of {int(data.supply)} · top {Math.max(0.01, (it.rank / data.supply) * 100).toFixed(it.rank / data.supply < 0.01 ? 2 : 1)}%
                    </p>
                  )}
                </div>
              </div>
              <div className="rounded-md bg-white/5 px-2.5 py-2">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-[#9aa0a6]">Ask</span>
                  <span className="num text-sm font-semibold">{it.ask != null ? `${zec(it.ask, 4)} ZEC` : "Not listed"}</span>
                </div>
                {it.ask != null && ref != null && (
                  <p className={deals[hover.i] ? "text-[#2fbf9c]" : "text-[#9aa0a6]"}>
                    {it.ask <= ref ? `${Math.round((1 - it.ask / ref) * 100)}% below` : `${Math.round((it.ask / ref - 1) * 100)}% above`} what its rarity band sold for this week ({zec(ref, 3)} ZEC)
                  </p>
                )}
                {it.ask != null && data.floor != null && it.ask > data.floor && <p className="text-[#9aa0a6]">{(it.ask / data.floor).toFixed(1)}× the collection floor</p>}
              </div>
              <div className="space-y-1">
                <Line k="Top bid" v={it.bid != null ? `${zec(it.bid, 4)} ZEC` : "—"} />
                <Line k="Last sale" v={it.last != null ? `${zec(it.last, 4)} ZEC` : "Never sold"} />
                {it.sales > 0 && <Line k="Sales on record" v={`${it.sales} · ${zec(it.volume, 2)} ZEC`} />}
              </div>
              <div className="space-y-1 border-t border-white/10 pt-2">
                {data.traits.map((t, n) =>
                  t.values.length > 1 && it.traits[n] >= 0 ? (
                    <div key={t.trait_type} className={`flex justify-between gap-3 ${view === "traits" && n === by ? "text-[#f4b728]" : ""}`}>
                      <span className="text-[#9aa0a6]">{t.trait_type}</span>
                      <span className="truncate text-right">
                        {t.values[it.traits[n]]} <span className="num text-[#9aa0a6]">{((traitCounts[n][it.traits[n]] / items.length) * 100).toFixed(1)}%</span>
                      </span>
                    </div>
                  ) : null,
                )}
              </div>
              <p className="text-[11px] text-[#5f6368]">
                <span className="pointer-coarse:hidden">Click to open the item page</span>
                <span className="hidden pointer-coarse:inline">Tap again to open the item page</span>
              </p>
            </div>
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
                className={`inline-block size-3 ${l.ring ? (l.box ? "rounded-[2px] border-2" : "rounded-full border-2") : "rounded-sm"}`}
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

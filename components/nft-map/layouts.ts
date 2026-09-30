import type { CollectionMap } from "@/lib/types";

/** One item of the map, decoded from the API's compact rows. */
export interface Item {
  id: number;
  rank: number | null;
  ask: number | null;
  bid: number | null;
  last: number | null;
  sales: number;
  volume: number;
  traits: number[];
}

export type View = "mosaic" | "traits" | "price" | "sales";
export type Order = "id" | "rank" | "ask" | "last";
export type SizeBy = "last" | "volume";
export type Show = "" | "listed" | "bids" | "sold" | "deals";

export interface Bounds {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/** A bubble of the trait view: every item with one value of the chosen trait type. */
export interface Group {
  value: number;
  label: string;
  x: number;
  y: number;
  r: number;
  count: number;
  listed: number;
  floor: number | null;
}

export interface PriceAxes {
  width: number;
  height: number;
  /** World x of a rarity rank (square-root scale: the rare end gets room). */
  x: (rank: number) => number;
  /** World y of a price in zatoshis (log scale). */
  y: (zat: number) => number;
  xTicks: number[];
  yTicks: number[];
  cap: number;
  /** Each rarity band's median sale of the last 7 days: [x0, x1, world y, zatoshis]. */
  reference: [number, number, number, number][];
}

/** Where every item sits in one view. Items with `s[i] = 0` aren't shown. */
export interface Layout {
  view: View;
  x: Float32Array;
  y: Float32Array;
  /** Side (square thumbnails) or diameter (round ones), in world units. */
  s: Float32Array;
  round: boolean;
  bounds: Bounds;
  groups: Group[];
  price: PriceAxes | null;
  /** Sales bubbles: the price from which bubbles stop growing. */
  sizeCap?: number;
  /** Listed well under what their rarity band sold for lately. */
  deals: Uint8Array;
}

export function decode(m: CollectionMap): Item[] {
  return m.items.map(([id, rank, ask, bid, last, sales, volume, traits]) => ({ id, rank, ask, bid, last, sales, volume, traits }));
}

const GAP = 0.92;

function empty(n: number, view: View): Layout {
  return {
    view,
    x: new Float32Array(n),
    y: new Float32Array(n),
    s: new Float32Array(n),
    round: false,
    bounds: { x0: 0, y0: 0, x1: 1, y1: 1 },
    groups: [],
    price: null,
    deals: new Uint8Array(n),
  };
}

function fitBounds(l: Layout, pad = 1) {
  let x0 = Infinity,
    y0 = Infinity,
    x1 = -Infinity,
    y1 = -Infinity;
  for (let i = 0; i < l.x.length; i++) {
    const h = l.s[i] / 2;
    if (!h) continue;
    x0 = Math.min(x0, l.x[i] - h);
    y0 = Math.min(y0, l.y[i] - h);
    x1 = Math.max(x1, l.x[i] + h);
    y1 = Math.max(y1, l.y[i] + h);
  }
  for (const g of l.groups) {
    x0 = Math.min(x0, g.x - g.r);
    y0 = Math.min(y0, g.y - g.r);
    x1 = Math.max(x1, g.x + g.r);
    y1 = Math.max(y1, g.y + g.r + 3);
  }
  if (!Number.isFinite(x0)) return { x0: 0, y0: 0, x1: 1, y1: 1 };
  return { x0: x0 - pad, y0: y0 - pad, x1: x1 + pad, y1: y1 + pad };
}

const nullsLast = (v: number | null, desc = false) => (v == null ? Infinity : desc ? -v : v);

/** Every item on a grid, 100 per row, in the chosen order. */
function mosaic(items: Item[], order: Order, aspect: number): Layout {
  const l = empty(items.length, "mosaic");
  const idx = items.map((_, i) => i);
  const key =
    order === "rank" ? (i: number) => nullsLast(items[i].rank) : order === "ask" ? (i: number) => nullsLast(items[i].ask) : order === "last" ? (i: number) => nullsLast(items[i].last, true) : (i: number) => items[i].id;
  idx.sort((a, b) => key(a) - key(b) || items[a].id - items[b].id);
  // As many columns as make the grid the shape of the frame.
  const cols = Math.max(1, Math.round(Math.sqrt(items.length * aspect)));
  idx.forEach((i, n) => {
    l.x[i] = (n % cols) + 0.5;
    l.y[i] = Math.floor(n / cols) + 0.5;
    l.s[i] = GAP;
  });
  l.bounds = fitBounds(l);
  return l;
}

/** Grid points around the origin, nearest first: the seats of a trait bubble. */
let seats: [number, number][] = [];
function seatsFor(n: number) {
  if (seats.length >= n) return seats;
  const R = Math.ceil(Math.sqrt(n / Math.PI)) + 2;
  const pts: [number, number][] = [];
  for (let i = -R; i <= R; i++) for (let j = -R; j <= R; j++) pts.push([i, j]);
  pts.sort((a, b) => a[0] ** 2 + a[1] ** 2 - (b[0] ** 2 + b[1] ** 2) || Math.atan2(a[1], a[0]) - Math.atan2(b[1], b[0]));
  seats = pts;
  return seats;
}

/** Places circles (mutating x/y) touching but not overlapping, biggest in the middle. Greedy and
 *  exact: each circle takes the free spot nearest the centre next to one already placed. */
export function packTight(circles: { x: number; y: number; r: number }[], gap: number) {
  const order = circles.map((_, i) => i).sort((a, b) => circles[b].r - circles[a].r);
  const placed: { x: number; y: number; r: number }[] = [];
  for (const i of order) {
    const c = circles[i];
    let best: [number, number] = [0, 0];
    if (placed.length) {
      let bd = Infinity;
      for (const p of placed) {
        for (let a = 0; a < 64; a++) {
          const ang = (a / 64) * Math.PI * 2;
          const x = p.x + Math.cos(ang) * (p.r + c.r + gap);
          const y = p.y + Math.sin(ang) * (p.r + c.r + gap);
          const d = x * x + y * y;
          if (d >= bd) continue;
          if (placed.some((o) => Math.hypot(o.x - x, o.y - y) < o.r + c.r + gap - 1e-6)) continue;
          bd = d;
          best = [x, y];
        }
      }
    }
    c.x = best[0];
    c.y = best[1];
    placed.push(c);
  }
}

/** Separates many circles (mutating x/y) until none overlap: biggest in the middle,
 *  cryptobubbles-style. Starts from a sunflower spiral, then relaxes with a spatial grid. */
export function pack(circles: { x: number; y: number; r: number }[], gap: number) {
  const order = circles.map((_, i) => i).sort((a, b) => circles[b].r - circles[a].r);
  let area = 0;
  order.forEach((i, n) => {
    const c = circles[i];
    area += Math.PI * (c.r + gap) ** 2;
    const rad = n === 0 ? 0 : Math.sqrt(area / Math.PI);
    const a = n * 2.39996;
    c.x = Math.cos(a) * rad;
    c.y = Math.sin(a) * rad;
  });
  const maxR = circles.reduce((m, c) => Math.max(m, c.r), 0) + gap;
  const cell = Math.max(maxR * 2, 1);
  for (let iter = 0; iter < 300; iter++) {
    const grid = new Map<number, number[]>();
    const key = (gx: number, gy: number) => gx * 100_003 + gy;
    circles.forEach((c, i) => {
      const k = key(Math.floor(c.x / cell), Math.floor(c.y / cell));
      const list = grid.get(k);
      if (list) list.push(i);
      else grid.set(k, [i]);
    });
    let worst = 0;
    circles.forEach((c, i) => {
      const gx = Math.floor(c.x / cell),
        gy = Math.floor(c.y / cell);
      for (let dx = -1; dx <= 1; dx++)
        for (let dy = -1; dy <= 1; dy++) {
          for (const j of grid.get(key(gx + dx, gy + dy)) ?? []) {
            if (j <= i) continue;
            const o = circles[j];
            let ddx = o.x - c.x,
              ddy = o.y - c.y;
            let d = Math.hypot(ddx, ddy);
            const min = c.r + o.r + gap;
            if (d >= min) continue;
            if (d < 1e-6) {
              ddx = Math.cos(i + j);
              ddy = Math.sin(i + j);
              d = 1;
            }
            const push = min - d;
            worst = Math.max(worst, push);
            // The smaller circle moves more.
            const wc = o.r ** 2 / (c.r ** 2 + o.r ** 2);
            c.x -= (ddx / d) * push * wc;
            c.y -= (ddy / d) * push * wc;
            o.x += (ddx / d) * push * (1 - wc);
            o.y += (ddy / d) * push * (1 - wc);
          }
        }
    });
    if (worst < 0.01) break;
  }
}

/** One bubble per value of a trait type, its items packed inside, rarest in the middle. */
function traits(items: Item[], type: number, labels: string[]): Layout {
  const l = empty(items.length, "traits");
  const members = new Map<number, number[]>();
  items.forEach((it, i) => {
    const v = it.traits[type] ?? -1;
    const list = members.get(v);
    if (list) list.push(i);
    else members.set(v, [i]);
  });
  const groups: Group[] = [...members].map(([value, list]) => {
    list.sort((a, b) => nullsLast(items[a].rank) - nullsLast(items[b].rank));
    const pts = seatsFor(list.length);
    const far = Math.hypot(...pts[list.length - 1]);
    const asks = list.map((i) => items[i].ask).filter((a): a is number => a != null);
    return {
      value,
      label: value < 0 ? "None" : (labels[value] ?? "?"),
      x: 0,
      y: 0,
      r: far + 0.9,
      count: list.length,
      listed: asks.length,
      floor: asks.length ? Math.min(...asks) : null,
    };
  });
  packTight(groups, 2.5);
  groups.forEach((g) => {
    const pts = seatsFor(g.count);
    members.get(g.value)!.forEach((i, n) => {
      l.x[i] = g.x + pts[n][0];
      l.y[i] = g.y + pts[n][1];
      l.s[i] = GAP;
    });
  });
  l.groups = groups.sort((a, b) => b.count - a.count);
  l.bounds = fitBounds(l, 2);
  return l;
}

const quantile = (sorted: number[], q: number) => sorted[Math.min(sorted.length - 1, Math.max(0, Math.floor(q * (sorted.length - 1))))];

/** Listed items: rarity rank across, asking price up (log scale). */
function price(items: Item[], m: CollectionMap): Layout {
  const l = empty(items.length, "price");
  const W = 200,
    H = 110,
    S = 1.6;
  const supply = Math.max(2, m.supply);
  const x = (rank: number) => ((Math.sqrt(rank) - 1) / (Math.sqrt(supply) - 1)) * W;
  const listed = items.map((it, i) => [it, i] as const).filter(([it]) => it.ask != null && it.rank != null);
  const asks = listed.map(([it]) => it.ask!).sort((a, b) => a - b);
  l.bounds = { x0: -16, y0: -10, x1: W + 4, y1: H + 12 };
  if (!asks.length) return l;
  const lo = Math.min(asks[0], ...m.bands.map((b) => b.reference ?? Infinity));
  // A few joke listings (millions of ZEC) would flatten everything else: cap the scale.
  const cap = Math.max(quantile(asks, 0.97), lo * 10);
  const ll = Math.log(lo),
    lc = Math.log(cap);
  const y = (zat: number) => H - ((Math.log(Math.min(Math.max(zat, lo), cap)) - ll) / (lc - ll || 1)) * H;
  const bandOf = (rank: number) => m.bands.find((b) => rank >= b.from_rank && rank <= b.to_rank);
  for (const [it, i] of listed) {
    l.x[i] = x(it.rank!);
    l.y[i] = y(it.ask!);
    l.s[i] = S;
    const ref = bandOf(it.rank!)?.reference;
    if (ref != null && it.ask! <= ref * (1 - m.deal_discount)) l.deals[i] = 1;
  }
  const yTicks: number[] = [];
  for (let e = -3; e <= 9; e++)
    for (const k of [1, 2, 5]) {
      const v = k * 10 ** e * 1e8;
      if (v >= lo && v <= cap) yTicks.push(v);
    }
  l.price = {
    width: W,
    height: H,
    x,
    y,
    xTicks: [1, ...m.bands.map((b) => b.to_rank)],
    yTicks,
    cap,
    reference: m.bands.filter((b) => b.reference != null).map((b) => [x(b.from_rank), x(b.to_rank), y(b.reference!), b.reference!]),
  };
  return l;
}

/** Every item that ever sold, as a bubble sized by its last sale or its archived volume. */
function sales(items: Item[], by: SizeBy): Layout {
  const l = empty(items.length, "sales");
  l.round = true;
  const val = (it: Item) => (by === "volume" ? it.volume || null : it.last);
  const sold = items.map((it, i) => [val(it), i] as const).filter((p): p is readonly [number, number] => p[0] != null && p[0] > 0);
  // Area follows the price up to the 99th percentile; the few record sales above it get the
  // largest size, so one outlier doesn't shrink everything else to dots.
  const cap = Math.max(1, quantile(sold.map(([v]) => v).sort((a, b) => a - b), 0.99));
  const circles = sold.map(([v, i]) => ({ i, x: 0, y: 0, r: 0.5 + 4.5 * Math.sqrt(Math.min(v, cap) / cap) + (v > cap ? 1.5 : 0) }));
  l.sizeCap = cap;
  pack(circles, 0.12);
  for (const c of circles) {
    l.x[c.i] = c.x;
    l.y[c.i] = c.y;
    l.s[c.i] = c.r * 2;
  }
  l.bounds = fitBounds(l);
  return l;
}

export function layout(items: Item[], m: CollectionMap, view: View, o: { order: Order; by: number; size: SizeBy; aspect: number }): Layout {
  switch (view) {
    case "traits":
      return traits(items, o.by, m.traits[o.by]?.values ?? []);
    case "price":
      return price(items, m);
    case "sales":
      return sales(items, o.size);
    default:
      return mosaic(items, o.order, o.aspect);
  }
}

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

/** One rarity band of the price view: a sideways histogram of its listings. */
export interface PriceColumn {
  x0: number;
  x1: number;
  from: number;
  to: number;
  listed: number;
  floor: number | null;
  /** Median sale of the last 7 days, when there were enough sales. */
  reference: number | null;
  deals: number;
}

export interface PriceAxes {
  width: number;
  height: number;
  /** World y of a price in zatoshis (log scale). */
  y: (zat: number) => number;
  yTicks: number[];
  cap: number;
  columns: PriceColumn[];
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
}

export function decode(m: CollectionMap): Item[] {
  return m.items.map(([id, rank, ask, bid, last, sales, volume, traits]) => ({ id, rank, ask, bid, last, sales, volume, traits }));
}

const bandOf = (m: CollectionMap, rank: number | null) => (rank == null ? undefined : m.bands.find((b) => rank >= b.from_rank && rank <= b.to_rank));

/** Listings at least `deal_discount` under what their rarity band sold for this week: the same
 *  rule as the collection's analytics. */
export function dealFlags(items: Item[], m: CollectionMap): Uint8Array {
  const out = new Uint8Array(items.length);
  items.forEach((it, i) => {
    const ref = bandOf(m, it.rank)?.reference;
    if (it.ask != null && ref != null && it.ask <= ref * (1 - m.deal_discount)) out[i] = 1;
  });
  return out;
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
function mosaic(items: Item[], order: Order, aspect: number, match: Uint8Array | null): Layout {
  const l = empty(items.length, "mosaic");
  const idx = items.map((_, i) => i);
  const key =
    order === "rank" ? (i: number) => nullsLast(items[i].rank) : order === "ask" ? (i: number) => nullsLast(items[i].ask) : order === "last" ? (i: number) => nullsLast(items[i].last, true) : (i: number) => items[i].id;
  // Highlighted items gather at the top, in the chosen order.
  const first = (i: number) => (match && !match[i] ? 1 : 0);
  idx.sort((a, b) => first(a) - first(b) || key(a) - key(b) || items[a].id - items[b].id);
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
 *  cryptobubbles-style. Starts from a sunflower spiral, then relaxes pairs found through a
 *  counting-sorted grid (typed arrays: thousands of bubbles in a few tens of milliseconds). */
export function pack(circles: { x: number; y: number; r: number }[], gap: number) {
  const n = circles.length;
  if (!n) return;
  const order = circles.map((_, i) => i).sort((a, b) => circles[b].r - circles[a].r);
  const X = new Float64Array(n),
    Y = new Float64Array(n),
    R = new Float64Array(n);
  let area = 0;
  order.forEach((i, k) => {
    const c = circles[i];
    area += Math.PI * (c.r + gap) ** 2;
    // Starting a little loose (70% density) lets the relaxation finish in a few passes.
    const rad = k === 0 ? 0 : Math.sqrt(area / (Math.PI * 0.7));
    X[i] = Math.cos(k * 2.39996) * rad;
    Y[i] = Math.sin(k * 2.39996) * rad;
    R[i] = c.r;
  });
  let maxR = 0;
  for (let i = 0; i < n; i++) maxR = Math.max(maxR, R[i]);
  const cell = (maxR + gap) * 2;
  const cellOf = new Int32Array(n),
    sorted = new Int32Array(n);
  for (let iter = 0; iter < 160; iter++) {
    let x0 = Infinity,
      y0 = Infinity,
      x1 = -Infinity,
      y1 = -Infinity;
    for (let i = 0; i < n; i++) {
      x0 = Math.min(x0, X[i]);
      y0 = Math.min(y0, Y[i]);
      x1 = Math.max(x1, X[i]);
      y1 = Math.max(y1, Y[i]);
    }
    const cols = Math.floor((x1 - x0) / cell) + 1,
      rows = Math.floor((y1 - y0) / cell) + 1;
    const start = new Int32Array(cols * rows + 1);
    for (let i = 0; i < n; i++) {
      const c = Math.floor((X[i] - x0) / cell) + Math.floor((Y[i] - y0) / cell) * cols;
      cellOf[i] = c;
      start[c + 1]++;
    }
    for (let c = 0; c < cols * rows; c++) start[c + 1] += start[c];
    const fill = start.slice(0, cols * rows);
    for (let i = 0; i < n; i++) sorted[fill[cellOf[i]]++] = i;
    let worst = 0;
    for (let i = 0; i < n; i++) {
      const cx = cellOf[i] % cols,
        cy = Math.floor(cellOf[i] / cols);
      for (let dy = -1; dy <= 1; dy++) {
        const yy = cy + dy;
        if (yy < 0 || yy >= rows) continue;
        for (let dx = -1; dx <= 1; dx++) {
          const xx = cx + dx;
          if (xx < 0 || xx >= cols) continue;
          const c = xx + yy * cols;
          for (let k = start[c]; k < start[c + 1]; k++) {
            const j = sorted[k];
            if (j <= i) continue;
            let ddx = X[j] - X[i],
              ddy = Y[j] - Y[i];
            let d = Math.hypot(ddx, ddy);
            const min = R[i] + R[j] + gap;
            if (d >= min) continue;
            if (d < 1e-6) {
              ddx = Math.cos(i + j);
              ddy = Math.sin(i + j);
              d = 1;
            }
            const push = min - d;
            worst = Math.max(worst, push);
            // The smaller circle moves more.
            const wi = R[j] ** 2 / (R[i] ** 2 + R[j] ** 2);
            X[i] -= (ddx / d) * push * wi;
            Y[i] -= (ddy / d) * push * wi;
            X[j] += (ddx / d) * push * (1 - wi);
            Y[j] += (ddy / d) * push * (1 - wi);
          }
        }
      }
    }
    if (worst < 0.02) break;
  }
  for (let i = 0; i < n; i++) {
    circles[i].x = X[i];
    circles[i].y = Y[i];
  }
}

/** One bubble per value of a trait type, its items packed inside, rarest in the middle. */
function traits(items: Item[], type: number, labels: string[], match: Uint8Array | null): Layout {
  const l = empty(items.length, "traits");
  const members = new Map<number, number[]>();
  items.forEach((it, i) => {
    const v = it.traits[type] ?? -1;
    const list = members.get(v);
    if (list) list.push(i);
    else members.set(v, [i]);
  });
  const groups: Group[] = [...members].map(([value, list]) => {
    // Highlighted items take the middle of their bubble; then the rarest.
    const first = (i: number) => (match && !match[i] ? 1 : 0);
    list.sort((a, b) => first(a) - first(b) || nullsLast(items[a].rank) - nullsLast(items[b].rank));
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

/** Listed items, one column per rarity band: each column is a sideways histogram of asking
 *  prices (log scale) made of the items themselves, next to what the band sold for lately. */
function price(items: Item[], m: CollectionMap, deals: Uint8Array): Layout {
  const l = empty(items.length, "price");
  const H = 110,
    S = 1.6,
    GAP_X = 6,
    MIN_W = 14;
  const listed = items.map((it, i) => [it, i] as const).filter(([it]) => it.ask != null && it.rank != null);
  const asks = listed.map(([it]) => it.ask!).sort((a, b) => a - b);
  if (!asks.length) {
    l.bounds = { x0: 0, y0: 0, x1: 100, y1: H };
    return l;
  }
  const lo = Math.min(asks[0], ...m.bands.map((b) => b.reference ?? Infinity));
  // A few joke listings (millions of ZEC) would flatten everything else: cap the scale.
  const cap = Math.max(quantile(asks, 0.97), lo * 10);
  const ll = Math.log(lo),
    lc = Math.log(cap);
  const y = (zat: number) => H - ((Math.log(Math.min(Math.max(zat, lo), cap)) - ll) / (lc - ll || 1)) * H;
  const bins = Math.ceil(H / S);
  let x = 0;
  const columns: PriceColumn[] = [];
  for (const band of m.bands) {
    const mine = listed.filter(([it]) => it.rank! >= band.from_rank && it.rank! <= band.to_rank);
    const rows: number[][] = Array.from({ length: bins + 1 }, () => []);
    for (const [it, i] of mine) rows[Math.min(bins, Math.floor(y(it.ask!) / S))].push(i);
    const widest = Math.max(1, ...rows.map((r) => r.length));
    const w = Math.max(MIN_W, widest * S + 2);
    const cx = x + w / 2;
    rows.forEach((row, b) => {
      // Cheapest first, from the middle outwards, so each row reads like a histogram bar.
      row.sort((a, c) => items[a].ask! - items[c].ask! || nullsLast(items[a].rank) - nullsLast(items[c].rank));
      row.forEach((i, k) => {
        const off = k === 0 ? 0 : Math.ceil(k / 2) * (k % 2 ? -1 : 1);
        l.x[i] = cx + off * S + (row.length % 2 ? 0 : S / 2);
        l.y[i] = Math.min(b, bins - 1) * S + S / 2;
        l.s[i] = S * 0.9;
      });
    });
    const bandAsks = mine.map(([it]) => it.ask!);
    columns.push({
      x0: x,
      x1: x + w,
      from: band.from_rank,
      to: band.to_rank,
      listed: mine.length,
      floor: bandAsks.length ? Math.min(...bandAsks) : null,
      reference: band.reference,
      deals: mine.filter(([, i]) => deals[i]).length,
    });
    x += w + GAP_X;
  }
  const yTicks: number[] = [];
  for (let e = -3; e <= 9; e++)
    for (const k of [1, 2, 5]) {
      const v = k * 10 ** e * 1e8;
      if (v >= lo && v <= cap) yTicks.push(v);
    }
  const width = x - GAP_X;
  l.price = { width, height: H, y, yTicks, cap, columns };
  l.bounds = { x0: -Math.max(10, width * 0.06), y0: -26, x1: width + 2, y1: H + 6 };
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

export interface LayoutOptions {
  order: Order;
  by: number;
  size: SizeBy;
  aspect: number;
  /** Highlighted items (the mosaic and trait bubbles gather them). */
  match: Uint8Array | null;
  deals: Uint8Array;
}

// Layouts are pure: switching back to a view reuses it instead of packing bubbles again.
const cache = new WeakMap<Item[], Map<string, Layout>>();

export function layout(items: Item[], m: CollectionMap, view: View, o: LayoutOptions, matchKey: string): Layout {
  const key =
    view === "mosaic" ? `m:${o.order}:${o.aspect}:${matchKey}` : view === "traits" ? `t:${o.by}:${matchKey}` : view === "price" ? "p" : `s:${o.size}`;
  let per = cache.get(items);
  if (!per) cache.set(items, (per = new Map()));
  const hit = per.get(key);
  if (hit) return hit;
  const l =
    view === "traits"
      ? traits(items, o.by, m.traits[o.by]?.values ?? [], o.match)
      : view === "price"
        ? price(items, m, o.deals)
        : view === "sales"
          ? sales(items, o.size)
          : mosaic(items, o.order, o.aspect, o.match);
  if (per.size > 40) per.clear();
  per.set(key, l);
  return l;
}

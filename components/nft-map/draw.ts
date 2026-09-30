import type { Group, Item, PriceAxes } from "./layouts";

/** The map is a dark stage in both themes: the artworks all sit on black. */
export const STAGE = {
  bg: "#0b0c0e",
  grid: "rgba(255,255,255,0.07)",
  text: "#e8eaed",
  muted: "#9aa0a6",
  faint: "#5f6368",
  link: "#4ea8de",
  good: "#2fbf9c",
  accent: "#f4b728",
  ring: "rgba(255,255,255,0.14)",
};

export interface Camera {
  cx: number;
  cy: number;
  k: number;
}

export interface Scene {
  items: Item[];
  x: Float32Array;
  y: Float32Array;
  s: Float32Array;
  round: boolean;
  groups: Group[];
  price: PriceAxes | null;
  /** Listed under what their band sold for lately (outlined in the price view). */
  deals: Uint8Array | null;
  /** Opacity of each item (highlighting dims the others); null: all opaque. */
  alpha: Float32Array | null;
  atlas: HTMLImageElement | null;
  cell: number;
  cols: number;
  hd: Map<number, HTMLImageElement>;
  floor: number | null;
  /** What sales bubbles are sized by, and so labelled with. */
  sizeBy: "last" | "volume";
  hover: number;
  hoverGroup: number;
  focus: number;
  /** 0 → 1 while a found item pulses. */
  pulse: number;
}

export const toScreen = (cam: Camera, w: number, h: number, x: number, y: number) => [(x - cam.cx) * cam.k + w / 2, (y - cam.cy) * cam.k + h / 2] as const;
export const toWorld = (cam: Camera, w: number, h: number, sx: number, sy: number) => [(sx - w / 2) / cam.k + cam.cx, (sy - h / 2) / cam.k + cam.cy] as const;

export const zecLabel = (zat: number) => {
  const v = zat / 1e8;
  return `${v >= 100 ? v.toLocaleString("en-US", { maximumFractionDigits: 0 }) : v.toLocaleString("en-US", { maximumFractionDigits: v >= 1 ? 2 : 3 })} ZEC`;
};

/** Trait floor over collection floor: how much the value is worth above the cheapest item. */
export function premiumColor(g: Group, floor: number | null) {
  if (g.floor == null || floor == null) return STAGE.faint;
  const r = g.floor / floor;
  return r >= 4 ? STAGE.accent : r >= 1.5 ? STAGE.link : "rgba(255,255,255,0.28)";
}

function thumb(ctx: CanvasRenderingContext2D, sc: Scene, id: number, x: number, y: number, size: number, round: boolean) {
  const hd = size >= 56 ? sc.hd.get(id) : undefined;
  if (round) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
    ctx.clip();
  }
  if (hd?.complete && hd.naturalWidth) ctx.drawImage(hd, x, y, size, size);
  else if (sc.atlas) {
    const slot = id - 1;
    ctx.drawImage(sc.atlas, (slot % sc.cols) * sc.cell, Math.floor(slot / sc.cols) * sc.cell, sc.cell, sc.cell, x, y, size, size);
  } else {
    ctx.fillStyle = "#1c1e22";
    ctx.fillRect(x, y, size, size);
  }
  if (round) ctx.restore();
}

function priceAxes(ctx: CanvasRenderingContext2D, p: PriceAxes, cam: Camera, w: number, h: number) {
  ctx.save();
  ctx.lineWidth = 1;
  const [px0, py0] = toScreen(cam, w, h, 0, 0);
  const [px1, py1] = toScreen(cam, w, h, p.width, p.height);
  // Column backgrounds: one per rarity band.
  for (const c of p.columns) {
    const [x0] = toScreen(cam, w, h, c.x0, 0);
    const [x1] = toScreen(cam, w, h, c.x1, 0);
    if (x1 < 0 || x0 > w) continue;
    ctx.fillStyle = "rgba(255,255,255,0.03)";
    ctx.beginPath();
    ctx.roundRect(x0, py0 - 4, x1 - x0, py1 - py0 + 8, 6);
    ctx.fill();
  }
  // Price lines across, labelled on the left.
  ctx.font = "11px Inter, system-ui, sans-serif";
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  const lx = Math.max(px0 - 8, 36);
  for (const t of p.yTicks) {
    const [, sy] = toScreen(cam, w, h, 0, p.y(t));
    if (sy < 30 || sy > h - 10) continue;
    ctx.strokeStyle = STAGE.grid;
    ctx.beginPath();
    ctx.moveTo(px0, Math.round(sy) + 0.5);
    ctx.lineTo(px1, Math.round(sy) + 0.5);
    ctx.stroke();
    ctx.fillStyle = STAGE.muted;
    ctx.fillText(`${t === p.yTicks[p.yTicks.length - 1] && t >= p.cap * 0.98 ? "≥ " : ""}${zecLabel(t).replace(" ZEC", "")}`, lx, sy);
  }
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = STAGE.faint;
  ctx.fillText("ZEC", Math.max(lx - 22, 4), Math.max(py0 - 22, 12));
  // Each band: its name and figures above, what it sold for as a line across.
  for (const c of p.columns) {
    const [x0, ty] = toScreen(cam, w, h, c.x0, 0);
    const [x1] = toScreen(cam, w, h, c.x1, 0);
    const cw = x1 - x0,
      mid = (x0 + x1) / 2;
    if (x1 < 0 || x0 > w) continue;
    ctx.textAlign = "center";
    const range = c.from === c.to ? `#${c.from.toLocaleString("en-US")}` : `#${c.from.toLocaleString("en-US")}–${c.to.toLocaleString("en-US")}`;
    ctx.font = `600 ${cw > 70 ? 12 : 10}px Inter, system-ui, sans-serif`;
    ctx.fillStyle = STAGE.text;
    // Only what fits its column: neighbours' labels must not run into each other.
    const room = cw + 4;
    if (ctx.measureText(range).width <= room) ctx.fillText(range, mid, ty - 50);
    // Figures under the name: listings, what the band sold for, deals.
    ctx.font = "10px Inter, system-ui, sans-serif";
    const lines: [string, string][] = [[`${c.listed.toLocaleString("en-US")} listed`, STAGE.muted]];
    if (c.reference != null) lines.push([`sold ~${zecLabel(c.reference)}`, STAGE.accent]);
    if (c.deals) lines.push([`${c.deals} deal${c.deals > 1 ? "s" : ""}`, STAGE.good]);
    lines.forEach(([t, color], n) => {
      if (ctx.measureText(t).width > room) return;
      ctx.fillStyle = color;
      ctx.fillText(t, mid, ty - 36 + n * 12);
    });
    if (c.reference != null) {
      const [, ry] = toScreen(cam, w, h, 0, p.y(c.reference));
      ctx.strokeStyle = STAGE.accent;
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.moveTo(x0 - 3, ry);
      ctx.lineTo(x1 + 3, ry);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }
  ctx.restore();
}

/** Draws the map. With `overlay`, the thumbnails are left to the WebGL layer underneath: only
 *  sharp pictures, marks, labels and the magnifier are drawn, on a transparent canvas. */
export function draw(ctx: CanvasRenderingContext2D, w: number, h: number, cam: Camera, sc: Scene, opts: { lens: boolean; overlay?: boolean }) {
  if (opts.overlay) ctx.clearRect(0, 0, w, h);
  else {
    ctx.fillStyle = STAGE.bg;
    ctx.fillRect(0, 0, w, h);
  }
  ctx.imageSmoothingEnabled = cam.k < sc.cell;
  ctx.imageSmoothingQuality = "medium";

  if (sc.price) priceAxes(ctx, sc.price, cam, w, h);

  // Trait bubbles.
  for (let n = 0; n < sc.groups.length; n++) {
    const g = sc.groups[n];
    const [sx, sy] = toScreen(cam, w, h, g.x, g.y);
    const r = g.r * cam.k;
    if (sx + r < 0 || sx - r > w || sy + r < 0 || sy - r > h) continue;
    ctx.beginPath();
    ctx.arc(sx, sy, r, 0, Math.PI * 2);
    ctx.fillStyle = n === sc.hoverGroup ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.025)";
    ctx.fill();
    ctx.lineWidth = n === sc.hoverGroup ? 2.5 : 1.5;
    ctx.strokeStyle = premiumColor(g, sc.floor);
    ctx.stroke();
  }

  const deals: [number, number, number][] = [];
  const labels: [number, number, number, number][] = [];
  for (let i = 0; i < sc.items.length; i++) {
    const s = sc.s[i];
    if (!s) continue;
    const size = s * cam.k;
    const [cx, cy] = toScreen(cam, w, h, sc.x[i], sc.y[i]);
    if (cx + size < 0 || cx - size > w || cy + size < 0 || cy - size > h) continue;
    const a = sc.alpha ? sc.alpha[i] : 1;
    if (a <= 0.01) continue;
    const on = a > 0.5;
    ctx.globalAlpha = a;
    if (!opts.overlay) thumb(ctx, sc, sc.items[i].id, cx - size / 2, cy - size / 2, size, sc.round && size >= 3);
    else if (size >= 56) {
      const hd = sc.hd.get(sc.items[i].id);
      if (hd?.complete && hd.naturalWidth) thumb(ctx, sc, sc.items[i].id, cx - size / 2, cy - size / 2, size, sc.round);
    }
    if (on && sc.deals?.[i]) deals.push([cx, cy, size]);
    if (on && sc.round && size >= 64) labels.push([i, cx, cy, size]);
  }
  ctx.globalAlpha = 1;

  if (sc.round) {
    // A thin ring separates touching bubbles.
    ctx.lineWidth = 1;
    ctx.strokeStyle = STAGE.ring;
    for (let i = 0; i < sc.items.length; i++) {
      const size = sc.s[i] * cam.k;
      if (size < 6) continue;
      const [cx, cy] = toScreen(cam, w, h, sc.x[i], sc.y[i]);
      if (cx + size < 0 || cx - size > w || cy + size < 0 || cy - size > h) continue;
      ctx.beginPath();
      ctx.arc(cx, cy, size / 2, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  // Deals: a tight green outline (the legend and each column's count say what it means).
  ctx.lineWidth = Math.min(2, Math.max(1, cam.k * 0.12));
  ctx.strokeStyle = STAGE.good;
  for (const [cx, cy, size] of deals) {
    const o = ctx.lineWidth / 2 + 0.5;
    ctx.strokeRect(cx - size / 2 - o, cy - size / 2 - o, size + 2 * o, size + 2 * o);
  }

  ctx.font = "600 11px Inter, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (const [i, cx, cy, size] of labels) {
    const it = sc.items[i];
    const v = sc.sizeBy === "volume" ? it.volume : it.last;
    if (!v) continue;
    const t = zecLabel(v);
    const tw = ctx.measureText(t).width + 10;
    const ly = cy + size / 2 - 14;
    ctx.fillStyle = "rgba(0,0,0,0.72)";
    ctx.beginPath();
    ctx.roundRect(cx - tw / 2, ly - 8, tw, 16, 8);
    ctx.fill();
    ctx.fillStyle = STAGE.text;
    ctx.fillText(t, cx, ly);
  }

  // Each trait bubble's name on a pill at its centre (neighbours never collide with it).
  for (let n = 0; n < sc.groups.length; n++) {
    const g = sc.groups[n];
    const r = g.r * cam.k;
    if (r < 34) continue;
    // Low in the bubble: its middle holds the rarest (or highlighted) items.
    const [sx, cy] = toScreen(cam, w, h, g.x, g.y);
    const sy = cy + r * 0.62;
    if (sx < -100 || sx > w + 100 || sy < -30 || sy > h + 30) continue;
    const big = r > 80;
    const name = g.label;
    const sub = `${g.count.toLocaleString("en-US")} items${g.floor != null ? ` · floor ${zecLabel(g.floor)}` : ""}`;
    ctx.font = `600 ${big ? 14 : 12}px Inter, system-ui, sans-serif`;
    const nw = ctx.measureText(name).width;
    ctx.font = "11px Inter, system-ui, sans-serif";
    const showSub = r > 60 && ctx.measureText(sub).width + 18 <= r * 1.8;
    const sw = showSub ? ctx.measureText(sub).width : 0;
    // A name that doesn't fit is left to the hover card rather than squeezed.
    if (nw + 18 > r * 1.8) continue;
    const bw = Math.min(Math.max(nw, sw) + 18, r * 1.8);
    const bh = showSub ? (big ? 40 : 36) : 22;
    ctx.fillStyle = "rgba(0,0,0,0.78)";
    ctx.beginPath();
    ctx.roundRect(sx - bw / 2, sy - bh / 2, bw, bh, 8);
    ctx.fill();
    ctx.fillStyle = STAGE.text;
    ctx.font = `600 ${big ? 14 : 12}px Inter, system-ui, sans-serif`;
    ctx.fillText(name, sx, showSub ? sy - (big ? 8 : 7) : sy, bw - 10);
    if (showSub) {
      ctx.font = "11px Inter, system-ui, sans-serif";
      ctx.fillStyle = STAGE.muted;
      ctx.fillText(sub, sx, sy + (big ? 10 : 9), bw - 10);
    }
  }

  if (sc.focus >= 0 && sc.s[sc.focus]) {
    const [cx, cy] = toScreen(cam, w, h, sc.x[sc.focus], sc.y[sc.focus]);
    const size = sc.s[sc.focus] * cam.k;
    ctx.strokeStyle = STAGE.accent;
    ctx.lineWidth = 2;
    ctx.globalAlpha = 1 - sc.pulse;
    ctx.beginPath();
    ctx.arc(cx, cy, size / 2 + 6 + sc.pulse * 40, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  // The magnifier: the item under the pointer, three times larger.
  if (opts.lens && sc.hover >= 0 && sc.s[sc.hover]) {
    const i = sc.hover;
    const [cx, cy] = toScreen(cam, w, h, sc.x[i], sc.y[i]);
    const size = Math.min(Math.max(sc.s[i] * cam.k * 3, 84), 200);
    const x = cx - size / 2,
      y = cy - size / 2;
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.6)";
    ctx.shadowBlur = 24;
    ctx.fillStyle = "#000";
    if (sc.round) {
      ctx.beginPath();
      ctx.arc(cx, cy, size / 2, 0, Math.PI * 2);
      ctx.fill();
    } else ctx.fillRect(x, y, size, size);
    ctx.restore();
    ctx.imageSmoothingEnabled = false;
    thumb(ctx, sc, sc.items[i].id, x, y, size, sc.round);
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#fff";
    if (sc.round) {
      ctx.beginPath();
      ctx.arc(cx, cy, size / 2, 0, Math.PI * 2);
      ctx.stroke();
    } else ctx.strokeRect(x - 1, y - 1, size + 2, size + 2);
  }
}

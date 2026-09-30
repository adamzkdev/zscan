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
  deals: Uint8Array | null;
  /** 1 where the item matches the highlight; null when nothing is highlighted. */
  match: Uint8Array | null;
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
  ctx.font = "11px Inter, system-ui, sans-serif";
  ctx.lineWidth = 1;
  const [px0, py0] = toScreen(cam, w, h, 0, 0);
  const [px1, py1] = toScreen(cam, w, h, p.width, p.height);
  // Horizontal price lines, labelled on the left edge of the plot (or of the screen).
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  const lx = Math.max(px0 - 8, 40);
  for (const t of p.yTicks) {
    const [, sy] = toScreen(cam, w, h, 0, p.y(t));
    if (sy < 24 || sy > h - 24) continue;
    ctx.strokeStyle = STAGE.grid;
    ctx.beginPath();
    ctx.moveTo(px0, Math.round(sy) + 0.5);
    ctx.lineTo(px1, Math.round(sy) + 0.5);
    ctx.stroke();
    ctx.fillStyle = STAGE.muted;
    ctx.fillText(zecLabel(t).replace(" ZEC", ""), lx, sy);
  }
  // Rarity band boundaries along the bottom.
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  const by = Math.min(py1 + 8, h - 30);
  let lastX = -Infinity;
  for (const r of p.xTicks) {
    const [sx] = toScreen(cam, w, h, p.x(r), 0);
    if (sx < 20 || sx > w - 10) continue;
    ctx.strokeStyle = STAGE.grid;
    ctx.beginPath();
    ctx.moveTo(Math.round(sx) + 0.5, py0);
    ctx.lineTo(Math.round(sx) + 0.5, py1);
    ctx.stroke();
    const label = `#${r.toLocaleString("en-US")}`;
    if (sx - lastX < ctx.measureText(label).width + 10) continue;
    ctx.fillStyle = STAGE.muted;
    ctx.fillText(label, sx, by);
    lastX = sx;
  }
  ctx.fillStyle = STAGE.faint;
  ctx.textAlign = "left";
  ctx.fillText("← rarest", Math.max(px0, 8), by + 15);
  ctx.textAlign = "right";
  ctx.fillText("Rarity rank (√ scale) · most common →", Math.min(px1, w - 8), by + 15);
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillText(`Asking price, ZEC (log scale; above ${zecLabel(p.cap)} shown at the top)`, Math.max(px0 - 30, 8), Math.max(py0 - 12, 14));
  // What each band sold for lately.
  ctx.strokeStyle = STAGE.accent;
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 4]);
  ctx.textAlign = "center";
  ctx.font = "600 11px Inter, system-ui, sans-serif";
  for (const [x0, x1, y, v] of p.reference) {
    const [sx0, sy] = toScreen(cam, w, h, x0, y);
    const [sx1] = toScreen(cam, w, h, x1, y);
    ctx.beginPath();
    ctx.moveTo(sx0, sy);
    ctx.lineTo(sx1, sy);
    ctx.stroke();
    if (sx1 - sx0 > 60) {
      ctx.fillStyle = STAGE.accent;
      ctx.fillText(zecLabel(v), (sx0 + sx1) / 2, sy - 6);
    }
  }
  ctx.restore();
}

export function draw(ctx: CanvasRenderingContext2D, w: number, h: number, cam: Camera, sc: Scene, opts: { lens: boolean }) {
  ctx.fillStyle = STAGE.bg;
  ctx.fillRect(0, 0, w, h);
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

  const dim = 0.14;
  const deals: [number, number, number][] = [];
  const labels: [number, number, number, number][] = [];
  for (let i = 0; i < sc.items.length; i++) {
    const s = sc.s[i];
    if (!s) continue;
    const size = s * cam.k;
    const [cx, cy] = toScreen(cam, w, h, sc.x[i], sc.y[i]);
    if (cx + size < 0 || cx - size > w || cy + size < 0 || cy - size > h) continue;
    const on = !sc.match || sc.match[i];
    ctx.globalAlpha = on ? 1 : dim;
    thumb(ctx, sc, sc.items[i].id, cx - size / 2, cy - size / 2, size, sc.round && size >= 3);
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

  ctx.lineWidth = 2;
  ctx.strokeStyle = STAGE.good;
  for (const [cx, cy, size] of deals) ctx.strokeRect(cx - size / 2 - 1.5, cy - size / 2 - 1.5, size + 3, size + 3);

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
    const [sx, sy] = toScreen(cam, w, h, g.x, g.y);
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

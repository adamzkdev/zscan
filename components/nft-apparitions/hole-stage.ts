import { STAGE } from "@/components/nft-map/draw";

/** One Apparition and where its snarks sat in the collection. */
export interface HoleGroup {
  slot: number;
  /** Reveal time, ms since epoch. */
  at: number;
  /** Item numbers purged for it. */
  items: number[];
}

export type Order = "rank" | "id";
export type HoleHit = { group: number; item: number | null } | null;

interface Callbacks {
  onTick?: (clock: number, revealed: number) => void;
  onHover?: (hit: HoleHit, x: number, y: number) => void;
}

/** A replay, in ms. */
const PLAY_MS = 12_000;
/** A thread takes this long to reach its Apparition, in ms of the replay. */
const DRAW_MS = 1_400;
/** Points per thread. */
const SEG = 16;

interface Layout {
  /** Mosaic: top-left and cell size (100 × 100 cells). */
  mx: number;
  my: number;
  cell: number;
  /** Apparition thumbnails: centre and side, per group. */
  thumbs: { x: number; y: number; s: number; left: boolean }[];
}

export class HoleStage {
  private ctx: CanvasRenderingContext2D;
  private mosaic: HTMLCanvasElement | null = null;
  private atlas: { img: HTMLImageElement; cell: number; cols: number } | null = null;
  private art = new Map<number, HTMLImageElement>();
  private order: Order = "rank";
  /** Grid position (0 … 9 999) of each item, per order. */
  private pos: Record<Order, Map<number, number>> = { rank: new Map(), id: new Map() };
  private ids: number[] = [];
  private l: Layout = { mx: 0, my: 0, cell: 0, thumbs: [] };
  private w = 0;
  private h = 0;
  private dpr = 1;
  private clock = Infinity;
  private span: [number, number];
  private raf = 0;
  private hover: HoleHit = null;

  constructor(
    private canvas: HTMLCanvasElement,
    private groups: HoleGroup[],
    private cb: Callbacks = {},
  ) {
    this.ctx = canvas.getContext("2d")!;
    const times = groups.map((g) => g.at).filter(Number.isFinite);
    const lo = Math.min(...times);
    const hi = Math.max(...times);
    const pad = Math.max(60_000, (hi - lo) * 0.04);
    this.span = [lo - pad, hi + pad];
    canvas.addEventListener("pointermove", this.onMove);
    canvas.addEventListener("pointerleave", this.onLeave);
  }

  destroy() {
    cancelAnimationFrame(this.raf);
    this.canvas.removeEventListener("pointermove", this.onMove);
    this.canvas.removeEventListener("pointerleave", this.onLeave);
  }

  /** Every item with its rank (rank order puts the rarest top-left). */
  setItems(items: { id: number; rank: number | null }[]) {
    this.ids = items.map((i) => i.id);
    const byRank = [...items].sort((a, b) => (a.rank ?? 1e9) - (b.rank ?? 1e9) || a.id - b.id);
    this.pos.rank = new Map(byRank.map((it, i) => [it.id, i]));
    this.pos.id = new Map(items.map((it) => [it.id, it.id - 1]));
    this.relayout();
  }

  setAtlas(img: HTMLImageElement, cell: number, cols: number) {
    this.atlas = { img, cell, cols };
    this.mosaic = null;
    this.draw();
  }

  setArt(slot: number, img: HTMLImageElement) {
    this.art.set(slot, img);
    this.draw();
  }

  setOrder(o: Order) {
    this.order = o;
    this.mosaic = null;
    this.relayout();
  }

  resize(w: number): number {
    this.w = w;
    this.h = Math.round(w < 640 ? w * 1.05 : Math.min(680, w * 0.55));
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.canvas.width = Math.round(w * this.dpr);
    this.canvas.height = Math.round(this.h * this.dpr);
    this.canvas.style.height = `${this.h}px`;
    this.mosaic = null;
    this.relayout();
    return this.h;
  }

  play() {
    cancelAnimationFrame(this.raf);
    const t0 = performance.now();
    const [lo, hi] = this.span;
    const step = (now: number) => {
      const t = (now - t0) / PLAY_MS;
      this.clock = lo + (hi - lo) * t;
      this.draw();
      this.cb.onTick?.(Math.min(this.clock, hi), this.groups.filter((g) => g.at <= this.clock).length);
      if (this.groups.some((g) => this.progress(g) < 1)) this.raf = requestAnimationFrame(step);
      else this.finish();
    };
    this.raf = requestAnimationFrame(step);
  }

  finish() {
    cancelAnimationFrame(this.raf);
    this.clock = Infinity;
    this.draw();
    this.cb.onTick?.(Infinity, this.groups.length);
  }

  /** 0 before a group's purge, 1 once its threads have reached it. */
  private progress(g: HoleGroup) {
    if (this.clock === Infinity) return 1;
    const [lo, hi] = this.span;
    const len = ((hi - lo) * DRAW_MS) / PLAY_MS;
    return Math.min(1, Math.max(0, (this.clock - g.at) / len));
  }

  private cellOf(item: number): [number, number] | null {
    const p = this.pos[this.order].get(item);
    if (p == null) return null;
    return [this.l.mx + ((p % 100) + 0.5) * this.l.cell, this.l.my + (Math.floor(p / 100) + 0.5) * this.l.cell];
  }

  /** Mosaic in the middle; Apparitions in two columns beside it, each on the side and at the
   *  height where its holes are, so threads cross as little as they can. */
  private relayout() {
    const { w, h } = this;
    if (!w) return;
    const narrow = w < 640;
    const thumb = narrow ? Math.min(34, (w - 16) / 13 - 4) : Math.min(46, (h - 24) / 13 - 6);
    const side = narrow ? 0 : thumb + 40;
    const m = narrow ? Math.min(w - 16, h - 2 * (thumb + 28)) : Math.min(h - 24, w - 2 * side - 80);
    this.l = { mx: (w - m) / 2, my: (h - m) / 2, cell: m / 100, thumbs: [] };
    if (!this.ids.length) return;
    const centre = this.groups.map((g) => {
      let x = 0;
      let y = 0;
      let n = 0;
      for (const it of g.items) {
        const c = this.cellOf(it);
        if (c) {
          x += c[0];
          y += c[1];
          n++;
        }
      }
      return n ? [x / n, y / n] : [w / 2, h / 2];
    });
    const idx = this.groups.map((_, i) => i);
    // Narrow: rows above and below, split by height; wide: columns left and right, split by x.
    const axis = narrow ? 1 : 0;
    idx.sort((a, b) => centre[a][axis] - centre[b][axis]);
    const half = Math.ceil(idx.length / 2);
    const first = idx.slice(0, half).sort((a, b) => centre[a][1 - axis] - centre[b][1 - axis]);
    const second = idx.slice(half).sort((a, b) => centre[a][1 - axis] - centre[b][1 - axis]);
    const thumbs: Layout["thumbs"] = Array(this.groups.length);
    const place = (list: number[], left: boolean) =>
      list.forEach((g, k) => {
        if (narrow) {
          const step = (w - 16) / list.length;
          thumbs[g] = { x: 8 + step * (k + 0.5), y: left ? this.l.my - thumb / 2 - 14 : this.l.my + m + thumb / 2 + 14, s: thumb, left };
        } else {
          const step = m / list.length;
          thumbs[g] = { x: left ? this.l.mx - 40 - thumb / 2 : this.l.mx + m + 40 + thumb / 2, y: this.l.my + step * (k + 0.5), s: thumb, left };
        }
      });
    place(first, true);
    place(second, false);
    this.l.thumbs = thumbs;
    this.draw();
  }

  /** The 10 000 thumbnails drawn once into their own canvas. */
  private ensureMosaic() {
    const a = this.atlas;
    if (this.mosaic || !a?.img.complete || !a.img.naturalWidth || !this.ids.length) return;
    const c = document.createElement("canvas");
    const px = Math.max(1, Math.round(this.l.cell * this.dpr));
    c.width = px * 100;
    c.height = px * 100;
    const ctx = c.getContext("2d")!;
    ctx.imageSmoothingEnabled = true;
    for (const id of this.ids) {
      const p = this.pos[this.order].get(id);
      if (p == null) continue;
      const s = id - 1;
      ctx.drawImage(a.img, (s % a.cols) * a.cell, Math.floor(s / a.cols) * a.cell, a.cell, a.cell, (p % 100) * px, Math.floor(p / 100) * px, px, px);
    }
    this.mosaic = c;
  }

  private thread(ctx: CanvasRenderingContext2D, from: [number, number], t: Layout["thumbs"][number], upto: number) {
    const [x0, y0] = from;
    const narrow = this.w < 640;
    const x1 = narrow ? t.x : t.left ? t.x + t.s / 2 + 2 : t.x - t.s / 2 - 2;
    const y1 = narrow ? (t.left ? t.y + t.s / 2 + 2 : t.y - t.s / 2 - 2) : t.y;
    // Leaves the mosaic straight towards its side, then bends to the Apparition.
    const cx = narrow ? x0 : (x0 + x1) / 2 + (t.left ? -1 : 1) * Math.abs(x1 - x0) * 0.25;
    const cy = narrow ? (y0 + y1) / 2 : y0;
    ctx.moveTo(x0, y0);
    const n = Math.max(1, Math.round(SEG * upto));
    for (let i = 1; i <= n; i++) {
      const u = Math.min(i / SEG, upto);
      const v = 1 - u;
      ctx.lineTo(v * v * x0 + 2 * v * u * cx + u * u * x1, v * v * y0 + 2 * v * u * cy + u * u * y1);
    }
  }

  private draw() {
    const ctx = this.ctx;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.paint(ctx, true);
  }

  /** The finished picture into any context, for the poster. */
  renderTo(ctx: CanvasRenderingContext2D, w: number, h: number) {
    const keep = { w: this.w, h: this.h, clock: this.clock, mosaic: this.mosaic, dpr: this.dpr };
    this.w = w;
    this.h = h;
    this.clock = Infinity;
    this.dpr = 1;
    this.mosaic = null;
    this.relayout();
    this.paint(ctx, false);
    Object.assign(this, keep);
    this.relayout();
  }

  private paint(ctx: CanvasRenderingContext2D, live: boolean) {
    const { w, h, l } = this;
    ctx.fillStyle = STAGE.bg;
    ctx.fillRect(0, 0, w, h);
    const m = l.cell * 100;
    this.ensureMosaic();
    if (this.mosaic) {
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(this.mosaic, l.mx, l.my, m, m);
      // Pushed back, so holes and threads read first.
      ctx.fillStyle = "rgba(11,12,14,0.55)";
      ctx.fillRect(l.mx, l.my, m, m);
    } else {
      ctx.fillStyle = "#1a1c20";
      ctx.fillRect(l.mx, l.my, m, m);
    }
    if (!l.thumbs.length) return;
    const hg = live ? (this.hover?.group ?? -1) : -1;

    // Holes: black where a snark was.
    this.groups.forEach((g, gi) => {
      if (this.progress(g) <= 0) return;
      for (const it of g.items) {
        const c = this.cellOf(it);
        if (!c) continue;
        ctx.fillStyle = STAGE.bg;
        ctx.fillRect(c[0] - l.cell / 2, c[1] - l.cell / 2, l.cell, l.cell);
        // An outline so a hole reads at a glance, brighter for the hovered Apparition.
        ctx.strokeStyle = gi === hg ? STAGE.text : hg >= 0 ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.6)";
        ctx.lineWidth = 1;
        ctx.strokeRect(c[0] - l.cell / 2 - 0.5, c[1] - l.cell / 2 - 0.5, l.cell + 1, l.cell + 1);
      }
    });

    // Threads, quieter when another Apparition is hovered.
    ctx.lineCap = "round";
    this.groups.forEach((g, gi) => {
      const p = this.progress(g);
      if (p <= 0) return;
      const t = l.thumbs[gi];
      ctx.beginPath();
      for (const it of g.items) {
        const c = this.cellOf(it);
        if (c) this.thread(ctx, c, t, p);
      }
      const on = gi === hg;
      ctx.strokeStyle = on ? "rgba(244,183,40,0.95)" : hg >= 0 ? "rgba(244,183,40,0.05)" : "rgba(244,183,40,0.11)";
      ctx.lineWidth = on ? 1.5 : 1;
      ctx.stroke();
    });

    // Apparitions.
    ctx.imageSmoothingEnabled = false;
    this.groups.forEach((g, gi) => {
      const t = l.thumbs[gi];
      const shown = this.progress(g) >= 1 ? 1 : this.progress(g) > 0 ? 0.6 : 0;
      const x = t.x - t.s / 2;
      const y = t.y - t.s / 2;
      ctx.strokeStyle = gi === hg ? STAGE.text : STAGE.ring;
      ctx.lineWidth = gi === hg ? 2 : 1;
      ctx.strokeRect(x - 1.5, y - 1.5, t.s + 3, t.s + 3);
      const img = this.art.get(g.slot);
      if (shown > 0 && img?.complete && img.naturalWidth) {
        ctx.globalAlpha = shown;
        ctx.drawImage(img, x, y, t.s, t.s);
        ctx.globalAlpha = 1;
      }
      ctx.fillStyle = shown ? STAGE.muted : STAGE.faint;
      ctx.font = "600 10px Inter, system-ui, sans-serif";
      ctx.textBaseline = "middle";
      const narrow = this.w < 640;
      ctx.textAlign = narrow ? "center" : t.left ? "right" : "left";
      const label = String(g.slot).padStart(2, "0");
      if (narrow) ctx.fillText(label, t.x, t.left ? y - 8 : y + t.s + 9);
      else ctx.fillText(label, t.left ? x - 6 : x + t.s + 6, t.y);
    });
  }

  private hit(px: number, py: number): HoleHit {
    const l = this.l;
    const gi = l.thumbs.findIndex((t) => Math.abs(px - t.x) <= t.s / 2 + 4 && Math.abs(py - t.y) <= t.s / 2 + 4);
    if (gi >= 0) return { group: gi, item: null };
    const m = l.cell * 100;
    if (px < l.mx || py < l.my || px >= l.mx + m || py >= l.my + m) return null;
    // A purged snark under the pointer, within a cell or so.
    let best: HoleHit = null;
    let bestD = Math.max(4, l.cell * 1.2);
    this.groups.forEach((g, i) => {
      if (this.progress(g) <= 0) return;
      for (const it of g.items) {
        const c = this.cellOf(it);
        if (!c) continue;
        const d = Math.hypot(c[0] - px, c[1] - py);
        if (d < bestD) {
          bestD = d;
          best = { group: i, item: it };
        }
      }
    });
    return best;
  }

  private onMove = (e: PointerEvent) => {
    const r = this.canvas.getBoundingClientRect();
    const h = this.hit(e.clientX - r.left, e.clientY - r.top);
    const same = h?.group === this.hover?.group && h?.item === this.hover?.item;
    this.hover = h;
    this.canvas.style.cursor = h ? "pointer" : "default";
    if (!same && this.clock === Infinity) this.draw();
    this.cb.onHover?.(h, e.clientX - r.left, e.clientY - r.top);
  };

  private onLeave = () => {
    this.hover = null;
    if (this.clock === Infinity) this.draw();
    this.cb.onHover?.(null, 0, 0);
  };
}

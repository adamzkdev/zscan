import { STAGE } from "@/components/nft-map/draw";

/** One Apparition and the snarks purged for it, ready to draw. */
export interface FusionCell {
  slot: number;
  item: string;
  /** Reveal time, ms since epoch. */
  at: number;
  /** Purged item numbers, rarest first. */
  ring: number[];
}

export type Hit = { cell: number; ring: number | null } | null;

interface Callbacks {
  /** Each frame of a replay: the clock it shows, and Apparitions revealed by then. */
  onTick?: (clock: number, revealed: number) => void;
  onHover?: (hit: Hit, x: number, y: number) => void;
  onSelect?: (cell: number) => void;
}

interface Grid {
  cols: number;
  /** Cell side, without the label line below it. */
  s: number;
  ox: number;
  oy: number;
  height: number;
}

/** The art is 26 × 26 pixels: it is uncovered one of those at a time. */
const PIX = 26;
/** Line under each cell: number and reveal time. */
const LABEL = 20;
/** A replay of the whole evening, in ms. */
const PLAY_MS = 14_000;
/** One fusion (snarks drawn in, Apparition uncovered), in ms of the replay. */
const FUSE_MS = 1_500;
/** Purged snarks stay around their Apparition, faded. */
const GHOST = 0.55;

const ease = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
const clamp = (t: number) => Math.min(1, Math.max(0, t));

/** A fixed shuffle of the art's pixels per Apparition, so a replay looks the same each time. */
function revealOrder(seed: number): Uint16Array {
  const n = PIX * PIX;
  const a = new Uint16Array(n);
  for (let i = 0; i < n; i++) a[i] = i;
  let x = (seed * 2654435761) >>> 0 || 1;
  for (let i = n - 1; i > 0; i--) {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    x >>>= 0;
    const j = x % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Columns that give the biggest cells in a `w` × `h` area (`h` unbounded: about 190 px each). */
export function grid(n: number, w: number, h?: number): Grid {
  if (h == null) {
    const cols = Math.max(3, Math.min(9, Math.round(w / 190)));
    const s = w / cols;
    return { cols, s, ox: 0, oy: 0, height: Math.ceil(n / cols) * (s + LABEL) };
  }
  let best: Grid = { cols: 1, s: 0, ox: 0, oy: 0, height: h };
  for (let cols = 3; cols <= 13; cols++) {
    const rows = Math.ceil(n / cols);
    const s = Math.min(w / cols, h / rows - LABEL);
    if (s > best.s) best = { cols, s, ox: (w - cols * s) / 2, oy: (h - rows * (s + LABEL)) / 2, height: h };
  }
  return best;
}

export class FusionStage {
  private ctx: CanvasRenderingContext2D;
  private cells: FusionCell[];
  private orders: Uint16Array[];
  private art = new Map<number, HTMLImageElement>();
  private atlas: { img: HTMLImageElement; cell: number; cols: number } | null = null;
  private g: Grid = { cols: 1, s: 0, ox: 0, oy: 0, height: 0 };
  private width = 0;
  private dpr = 1;
  /** The clock shown, ms since epoch; `Infinity` when everything is revealed. */
  private clock = Infinity;
  private span: [number, number];
  private raf = 0;
  private started = 0;
  private hover: Hit = null;
  private selected = -1;

  constructor(
    private canvas: HTMLCanvasElement,
    cells: FusionCell[],
    private cb: Callbacks = {},
  ) {
    this.ctx = canvas.getContext("2d")!;
    this.cells = cells;
    this.orders = cells.map((c) => revealOrder(c.slot));
    const times = cells.map((c) => c.at).filter(Number.isFinite);
    const lo = times.length ? Math.min(...times) : 0;
    const hi = times.length ? Math.max(...times) : 0;
    // A little before the first reveal, and long enough after the last to see it land.
    const pad = Math.max(60_000, (hi - lo) * 0.04);
    this.span = [lo - pad, hi + pad * 2];
    canvas.addEventListener("pointermove", this.onMove);
    canvas.addEventListener("pointerleave", this.onLeave);
    canvas.addEventListener("click", this.onClick);
  }

  destroy() {
    cancelAnimationFrame(this.raf);
    this.canvas.removeEventListener("pointermove", this.onMove);
    this.canvas.removeEventListener("pointerleave", this.onLeave);
    this.canvas.removeEventListener("click", this.onClick);
  }

  get timeSpan(): [number, number] {
    return this.span;
  }

  setAtlas(img: HTMLImageElement, cell: number, cols: number) {
    this.atlas = { img, cell, cols };
    this.draw();
  }

  setArt(slot: number, img: HTMLImageElement) {
    this.art.set(slot, img);
    this.draw();
  }

  select(cell: number) {
    this.selected = cell;
    this.draw();
  }

  /** Lays the cells out for a new width; returns the height the canvas needs (CSS pixels). */
  resize(width: number): number {
    this.width = width;
    this.g = grid(this.cells.length, width);
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.canvas.width = Math.round(width * this.dpr);
    this.canvas.height = Math.round(this.g.height * this.dpr);
    this.canvas.style.height = `${this.g.height}px`;
    this.draw();
    return this.g.height;
  }

  /** Replays the evening: every Apparition at its own time. */
  play() {
    cancelAnimationFrame(this.raf);
    this.started = performance.now();
    const step = (now: number) => {
      const t = (now - this.started) / PLAY_MS;
      const [lo, hi] = this.span;
      // The clock runs on past the end until the last fusion has settled.
      this.clock = lo + (hi - lo) * t;
      this.draw();
      this.cb.onTick?.(Math.min(this.clock, hi), this.cells.filter((c) => c.at <= this.clock).length);
      if (this.cells.some((c) => this.phase(c) < 2)) {
        this.raf = requestAnimationFrame(step);
      } else {
        this.clock = Infinity;
        this.draw();
        this.cb.onTick?.(Infinity, this.cells.length);
      }
    };
    this.raf = requestAnimationFrame(step);
  }

  /** Jumps to the end: every Apparition revealed. */
  finish() {
    cancelAnimationFrame(this.raf);
    this.clock = Infinity;
    this.draw();
    this.cb.onTick?.(Infinity, this.cells.length);
  }

  /** Where a cell is in its fusion: < 0 before, 0–1 drawing in, 1–2 ghosts settling, ≥ 2 done. */
  private phase(c: FusionCell): number {
    if (this.clock === Infinity) return 2;
    const [lo, hi] = this.span;
    const fuse = ((hi - lo) * FUSE_MS) / PLAY_MS;
    return (this.clock - c.at) / fuse;
  }

  private draw() {
    const { ctx } = this;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.paint(ctx, this.g, this.width, this.g.height, true);
  }

  /** The final picture (everything revealed) into any context, for the poster. */
  renderTo(ctx: CanvasRenderingContext2D, w: number, h: number) {
    const clock = this.clock;
    this.clock = Infinity;
    this.paint(ctx, grid(this.cells.length, w, h), w, h, false);
    this.clock = clock;
  }

  private paint(ctx: CanvasRenderingContext2D, g: Grid, w: number, h: number, live: boolean) {
    ctx.fillStyle = STAGE.bg;
    ctx.fillRect(0, 0, w, h);
    ctx.imageSmoothingEnabled = false;
    const orbit = this.clock === Infinity ? 0 : (performance.now() - this.started) / 9000;
    this.cells.forEach((c, i) => {
      const x0 = g.ox + (i % g.cols) * g.s;
      const y0 = g.oy + Math.floor(i / g.cols) * (g.s + LABEL);
      const s = g.s;
      const cx = x0 + s / 2;
      const cy = y0 + s / 2;
      const q = this.phase(c);
      const hovered = live && this.hover?.cell === i;

      if (hovered || (live && this.selected === i)) {
        ctx.fillStyle = "rgba(255,255,255,0.04)";
        ctx.fillRect(x0 + 2, y0 + 2, s - 4, s + LABEL - 4);
      }
      if (live && this.selected === i) {
        ctx.strokeStyle = STAGE.link;
        ctx.lineWidth = 2;
        ctx.strokeRect(x0 + 3, y0 + 3, s - 6, s + LABEL - 6);
      }

      // The 26 purged snarks: two rings of 13 around the Apparition.
      const t = s * 0.11;
      const drawIn = ease(clamp(q));
      c.ring.forEach((id, k) => {
        const outer = k % 2;
        const j = Math.floor(k / 2);
        // Each snark leaves a little after the previous one.
        const mine = q < 0 ? 0 : ease(clamp(q * 1.35 - (k / c.ring.length) * 0.35));
        const settled = q >= 1;
        const spin = (outer ? -1 : 1) * orbit * (1 - drawIn);
        const a = ((j + (outer ? 0.5 : 0)) / 13) * Math.PI * 2 - Math.PI / 2 + spin;
        const r0 = s * (outer ? 0.43 : 0.315);
        const r = settled ? r0 : r0 * (1 - mine);
        const size = settled ? t : t * (1 - 0.65 * mine);
        let alpha = q < 0 ? 0.95 : settled ? GHOST * ease(clamp(q - 1)) : 1 - 0.85 * mine;
        if (live && this.hover?.cell === i && this.hover.ring === k) alpha = 1;
        if (alpha <= 0.01) return;
        const px = cx + Math.cos(a) * r - size / 2;
        const py = cy + Math.sin(a) * r - size / 2;
        ctx.globalAlpha = alpha;
        this.thumb(ctx, id, px, py, size);
        ctx.globalAlpha = 1;
        if (live && this.hover?.cell === i && this.hover.ring === k) {
          ctx.strokeStyle = STAGE.text;
          ctx.lineWidth = 1.5;
          ctx.strokeRect(px - 1, py - 1, size + 2, size + 2);
        }
      });

      // The Apparition, uncovered pixel by pixel as the snarks reach it.
      const side = s * 0.36;
      const ax = cx - side / 2;
      const ay = cy - side / 2;
      const shown = clamp((q - 0.3) / 0.7);
      if (shown <= 0) {
        ctx.strokeStyle = STAGE.ring;
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.strokeRect(ax + 0.5, ay + 0.5, side - 1, side - 1);
        ctx.setLineDash([]);
      } else {
        const img = this.art.get(c.slot);
        if (img?.complete && img.naturalWidth) ctx.drawImage(img, ax, ay, side, side);
        else {
          ctx.fillStyle = "#1c1e22";
          ctx.fillRect(ax, ay, side, side);
        }
        if (shown < 1) {
          const order = this.orders[i];
          const hidden = Math.round(order.length * (1 - shown));
          const px = side / PIX;
          ctx.fillStyle = STAGE.bg;
          for (let n = order.length - hidden; n < order.length; n++) {
            const p = order[n];
            ctx.fillRect(ax + (p % PIX) * px, ay + Math.floor(p / PIX) * px, Math.ceil(px), Math.ceil(px));
          }
        }
      }

      // Number, and reveal time.
      ctx.textBaseline = "middle";
      ctx.font = `600 ${Math.max(11, Math.min(13, s * 0.075))}px Inter, system-ui, sans-serif`;
      ctx.textAlign = "left";
      ctx.fillStyle = q >= 0.3 ? STAGE.text : STAGE.faint;
      const ly = y0 + s + LABEL / 2 - 4;
      ctx.fillText(String(c.slot).padStart(2, "0"), x0 + 10, ly);
      ctx.textAlign = "right";
      ctx.fillStyle = STAGE.muted;
      ctx.font = `${Math.max(10, Math.min(12, s * 0.07))}px Inter, system-ui, sans-serif`;
      if (Number.isFinite(c.at)) ctx.fillText(hhmm(c.at), x0 + s - 10, ly);
    });
  }

  private thumb(ctx: CanvasRenderingContext2D, id: number, x: number, y: number, size: number) {
    const a = this.atlas;
    if (a?.img.complete && a.img.naturalWidth) {
      const slot = id - 1;
      ctx.drawImage(a.img, (slot % a.cols) * a.cell, Math.floor(slot / a.cols) * a.cell, a.cell, a.cell, x, y, size, size);
    } else {
      ctx.fillStyle = "#2a2d32";
      ctx.fillRect(x, y, size, size);
    }
  }

  private hit(px: number, py: number): Hit {
    const g = this.g;
    const col = Math.floor(px / g.s);
    const row = Math.floor(py / (g.s + LABEL));
    const i = row * g.cols + col;
    if (col < 0 || col >= g.cols || i < 0 || i >= this.cells.length) return null;
    const c = this.cells[i];
    const s = g.s;
    const cx = col * s + s / 2;
    const cy = row * (s + LABEL) + s / 2;
    const t = s * 0.11;
    let best: number | null = null;
    let bestD = Infinity;
    if (this.phase(c) >= 1 || this.phase(c) < 0) {
      c.ring.forEach((_, k) => {
        const outer = k % 2;
        const a = ((Math.floor(k / 2) + (outer ? 0.5 : 0)) / 13) * Math.PI * 2 - Math.PI / 2;
        const r = s * (outer ? 0.43 : 0.315);
        const d = Math.hypot(cx + Math.cos(a) * r - px, cy + Math.sin(a) * r - py);
        if (d < bestD) {
          bestD = d;
          best = k;
        }
      });
    }
    // Hit targets a little bigger than the thumbnails.
    return { cell: i, ring: bestD <= t * 0.75 ? best : null };
  }

  private onMove = (e: PointerEvent) => {
    const r = this.canvas.getBoundingClientRect();
    const h = this.hit(e.clientX - r.left, e.clientY - r.top);
    const same = h?.cell === this.hover?.cell && h?.ring === this.hover?.ring;
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

  private onClick = () => {
    if (this.hover) this.cb.onSelect?.(this.hover.cell);
  };
}

/** `19:07` in UTC. */
export function hhmm(ms: number): string {
  return new Date(ms).toISOString().slice(11, 16);
}

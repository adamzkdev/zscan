import { type Camera, draw, type Scene, STAGE, toScreen, toWorld } from "./draw";
import { SpriteLayer } from "./sprites";
import type { Layout } from "./layouts";

const ANIM_MS = 650;
const FADE_MS = 450;
/** Opacity of items outside the highlight. */
const DIM = 0.13;
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

function fit(l: Layout, w: number, h: number): Camera {
  const b = l.bounds;
  return { cx: (b.x0 + b.x1) / 2, cy: (b.y0 + b.y1) / 2, k: Math.min(w / (b.x1 - b.x0), h / (b.y1 - b.y0)) };
}

/** Items indexed by world cell, for hit tests. */
function hitGrid(l: Layout) {
  let max = 1;
  for (let i = 0; i < l.s.length; i++) max = Math.max(max, l.s[i]);
  const cell = Math.max(2, max);
  const grid = new Map<string, number[]>();
  for (let i = 0; i < l.s.length; i++) {
    const h = l.s[i] / 2;
    if (!h) continue;
    for (let gx = Math.floor((l.x[i] - h) / cell); gx <= Math.floor((l.x[i] + h) / cell); gx++)
      for (let gy = Math.floor((l.y[i] - h) / cell); gy <= Math.floor((l.y[i] + h) / cell); gy++) {
        const k = `${gx},${gy}`;
        const list = grid.get(k);
        if (list) list.push(i);
        else grid.set(k, [i]);
      }
  }
  return (x: number, y: number) => {
    const list = grid.get(`${Math.floor(x / cell)},${Math.floor(y / cell)}`) ?? [];
    for (let n = list.length - 1; n >= 0; n--) {
      const i = list[n];
      const h = l.s[i] / 2;
      if (l.round ? Math.hypot(x - l.x[i], y - l.y[i]) <= h : Math.abs(x - l.x[i]) <= h && Math.abs(y - l.y[i]) <= h) return i;
    }
    return -1;
  };
}

/** The map's canvas: camera, animated layouts, pointer handling and sharp pictures, outside React. */
export class MapEngine {
  private w = 0;
  private h = 0;
  private cam: Camera = { cx: 0, cy: 0, k: 1 };
  private camAnim: { from: Camera; to: Camera; t0: number } | null = null;
  private lay: Layout | null = null;
  private pos: { x: Float32Array; y: Float32Array; s: Float32Array } | null = null;
  private anim: { from: { x: Float32Array; y: Float32Array; s: Float32Array }; t0: number } | null = null;
  private hit: (x: number, y: number) => number = () => -1;
  private hd = new Map<number, HTMLImageElement>();
  private focus = { i: -1, t0: 0 };
  private raf = 0;
  /** Under the pointer (outlined), and clicked (outlined, details in the side panel). */
  private hover = { i: -1, group: -1 };
  private selected = -1;
  private pointers = new Map<number, { x: number; y: number }>();
  private drag = { moved: 0, pinch: false };
  private ro: ResizeObserver;
  private alpha: Float32Array | null = null;
  private fade: { from: Float32Array; to: Float32Array; t0: number } | null = null;
  private scene: Omit<Scene, "x" | "y" | "s" | "round" | "groups" | "price" | "hover" | "hoverGroup" | "selected" | "focus" | "pulse" | "hd" | "alpha"> = {
    items: [],
    deals: null,
    atlas: null,
    cell: 32,
    cols: 100,
    floor: null,
    sizeBy: "last",
  };

  private sprites: SpriteLayer;

  /** `canvas` takes the pointer and draws marks and labels; `under` gets the thumbnails. */
  constructor(
    private canvas: HTMLCanvasElement,
    under: HTMLCanvasElement,
    private opts: { imageUrl: (id: number) => string; onSelect: (i: number) => void },
  ) {
    this.sprites = new SpriteLayer(under, STAGE.bg);
    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(canvas);
    canvas.addEventListener("wheel", this.onWheel, { passive: false });
    canvas.addEventListener("pointerdown", this.onDown);
    canvas.addEventListener("pointermove", this.onMove);
    canvas.addEventListener("pointerup", this.onUp);
    canvas.addEventListener("pointercancel", this.onCancel);
    canvas.addEventListener("pointerleave", this.onLeave);
    this.resize();
  }

  destroy() {
    this.ro.disconnect();
    cancelAnimationFrame(this.raf);
    const c = this.canvas;
    c.removeEventListener("wheel", this.onWheel);
    c.removeEventListener("pointerdown", this.onDown);
    c.removeEventListener("pointermove", this.onMove);
    c.removeEventListener("pointerup", this.onUp);
    c.removeEventListener("pointercancel", this.onCancel);
    c.removeEventListener("pointerleave", this.onLeave);
  }

  get size() {
    return { w: this.w, h: this.h };
  }

  /** Items, the atlas and other drawing inputs that don't move anything. */
  update(s: Partial<MapEngine["scene"]>) {
    if (s.items && s.items !== this.scene.items) this.sprites.setItems(s.items.map((it) => it.id));
    Object.assign(this.scene, s);
    const { atlas, cell, cols } = this.scene;
    if ((s.atlas || s.cell) && atlas) this.sprites.setAtlas(atlas, cell, cols);
    this.invalidate();
  }

  /** Highlights the items where `match` is 1 (null: all): the others fade out. */
  highlight(match: Uint8Array | null) {
    const n = this.scene.items.length;
    const to = new Float32Array(n).fill(1);
    if (match) for (let i = 0; i < n; i++) if (!match[i]) to[i] = DIM;
    const from = this.alpha && this.alpha.length === n ? this.alpha.slice() : new Float32Array(n).fill(1);
    this.alpha = from.slice();
    this.fade = { from, to, t0: performance.now() };
    this.invalidate();
  }

  /** A new layout: every item travels from where it is to its new seat, the camera to fit. */
  setLayout(l: Layout) {
    if (l === this.lay) return;
    const first = !this.pos || this.pos.x.length !== l.x.length;
    this.lay = l;
    this.hit = hitGrid(l);
    const target = fit(l, this.w || 800, this.h || 500);
    if (first) {
      this.pos = { x: l.x.slice(), y: l.y.slice(), s: l.s.slice() };
      this.cam = target;
      this.anim = null;
    } else {
      const p = this.pos!;
      this.anim = { from: { x: p.x.slice(), y: p.y.slice(), s: p.s.slice() }, t0: performance.now() };
      this.camAnim = { from: { ...this.cam }, to: target, t0: performance.now() };
    }
    this.hover = { i: -1, group: -1 };
    // A selection the new view hides is let go.
    if (this.selected >= 0 && !l.s[this.selected]) this.select(-1);
    this.invalidate();
  }

  /** Selects an item (-1: none): outlined on the map, details in the side panel. */
  select(i: number) {
    if (i === this.selected) return;
    this.selected = i;
    this.opts.onSelect(i);
    this.invalidate();
  }

  zoomBy(f: number) {
    this.zoomAt(this.w / 2, this.h / 2, f);
  }

  reset() {
    if (this.lay) this.flyTo(fit(this.lay, this.w, this.h));
  }

  /** Flies to an item, pulses and selects it. False when the current view hides it. */
  goTo(i: number) {
    const l = this.lay;
    if (!l || !l.s[i]) return false;
    const s = l.s[i];
    const delay = this.anim ? ANIM_MS : 0;
    setTimeout(() => {
      this.flyTo({ cx: l.x[i], cy: l.y[i], k: Math.min(Math.max(90 / s, this.cam.k), Math.min(this.w, this.h) / (s * 3)) });
      this.focus = { i, t0: performance.now() + ANIM_MS };
      this.select(i);
    }, delay);
    return true;
  }

  /** Draws what the screen shows into another canvas area, for the poster. */
  renderTo(ctx: CanvasRenderingContext2D, w: number, h: number) {
    if (!this.lay || !this.pos) return;
    const k = this.cam.k * Math.min(w / this.w, h / this.h);
    draw(ctx, w, h, { ...this.cam, k }, { ...this.sceneFor(this.lay), hover: -1, hoverGroup: -1, selected: -1, focus: -1, pulse: 0 });
  }

  // ---- internals ----------------------------------------------------------------------------

  private sceneFor(l: Layout): Scene {
    const p = this.pos!;
    return {
      ...this.scene,
      x: p.x,
      y: p.y,
      s: p.s,
      round: l.round,
      groups: l.groups,
      price: l.price,
      deals: l.view === "price" ? this.scene.deals : null,
      alpha: this.alpha,
      hd: this.hd,
      hover: this.hover.i,
      hoverGroup: this.hover.group,
      selected: this.selected,
      focus: -1,
      pulse: 0,
    };
  }

  private setHover(h: { i: number; group: number }) {
    if (h.i === this.hover.i && h.group === this.hover.group) return;
    this.hover = h;
    this.canvas.style.cursor = h.i >= 0 ? "pointer" : h.group >= 0 ? "zoom-in" : "grab";
    this.invalidate();
  }

  private resize() {
    const r = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const first = !this.w;
    this.w = r.width;
    this.h = r.height;
    this.canvas.width = Math.round(r.width * dpr);
    this.canvas.height = Math.round(r.height * dpr);
    this.sprites.resize(r.width, r.height, dpr);
    if (first && this.lay) this.cam = fit(this.lay, r.width, r.height);
    this.invalidate();
  }

  private invalidate() {
    if (!this.raf) this.raf = requestAnimationFrame(this.frame);
  }

  private frame = (now: number) => {
    this.raf = 0;
    const l = this.lay;
    const p = this.pos;
    if (!l || !p || !this.w) return;
    let again = false;
    if (this.anim) {
      const t = Math.min(1, (now - this.anim.t0) / ANIM_MS);
      const e = ease(t);
      const f = this.anim.from;
      for (let i = 0; i < p.x.length; i++) {
        // Items entering the view grow in place; leaving ones shrink where they were.
        const fx = f.s[i] ? f.x[i] : l.x[i],
          fy = f.s[i] ? f.y[i] : l.y[i];
        const tx = l.s[i] ? l.x[i] : f.x[i],
          ty = l.s[i] ? l.y[i] : f.y[i];
        p.x[i] = fx + (tx - fx) * e;
        p.y[i] = fy + (ty - fy) * e;
        p.s[i] = f.s[i] + (l.s[i] - f.s[i]) * e;
      }
      if (t < 1) again = true;
      else this.anim = null;
    }
    if (this.camAnim) {
      const t = Math.min(1, (now - this.camAnim.t0) / ANIM_MS);
      const e = ease(t);
      const { from, to } = this.camAnim;
      // Zoom interpolates geometrically so it feels even.
      this.cam = { cx: from.cx + (to.cx - from.cx) * e, cy: from.cy + (to.cy - from.cy) * e, k: from.k * (to.k / from.k) ** e };
      if (t < 1) again = true;
      else this.camAnim = null;
    }
    if (this.fade && this.alpha) {
      const t = Math.min(1, (now - this.fade.t0) / FADE_MS);
      const e = ease(t);
      const { from, to } = this.fade;
      for (let i = 0; i < this.alpha.length; i++) this.alpha[i] = from[i] + (to[i] - from[i]) * e;
      if (t < 1) again = true;
      else this.fade = null;
    }
    const sc = this.sceneFor(l);
    if (this.focus.i >= 0) {
      const t = (now - this.focus.t0) / 1600;
      if (t < 1) {
        if (t > 0) {
          sc.focus = this.focus.i;
          sc.pulse = (t * 2) % 1;
        }
        again = true;
      } else this.focus.i = -1;
    }
    const ctx = this.canvas.getContext("2d")!;
    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const gl = this.sprites.ok;
    if (gl) this.sprites.draw(this.w, this.h, this.cam, p.x, p.y, p.s, this.alpha, l.round);
    draw(ctx, this.w, this.h, this.cam, sc, { overlay: gl });
    if (!this.anim) this.loadSharp(sc);
    if (again) this.raf = requestAnimationFrame(this.frame);
  };

  /** Full-size pictures for the items shown large (and the one under the pointer). */
  private loadSharp(sc: Scene) {
    const p = this.pos!;
    const want = (i: number) => {
      const id = sc.items[i].id;
      if (this.hd.has(id)) return false;
      const img = new Image();
      img.onload = () => this.invalidate();
      img.src = this.opts.imageUrl(id);
      this.hd.set(id, img);
      if (this.hd.size > 400) this.hd.delete(this.hd.keys().next().value!);
      return true;
    };
    let wanted = 0;
    for (let i = 0; i < p.x.length && wanted < 36; i++) {
      const s = p.s[i] * this.cam.k;
      if (s < 56) continue;
      const [sx, sy] = toScreen(this.cam, this.w, this.h, p.x[i], p.y[i]);
      if (sx + s < 0 || sx - s > this.w || sy + s < 0 || sy - s > this.h) continue;
      if (want(i)) wanted++;
    }
  }

  private limits() {
    const k0 = this.lay ? fit(this.lay, this.w, this.h).k : 1;
    return [k0 * 0.5, Math.max(k0 * 4, 320)] as const;
  }

  private zoomAt(sx: number, sy: number, factor: number) {
    const [lo, hi] = this.limits();
    const k = Math.min(hi, Math.max(lo, this.cam.k * factor));
    const [wx, wy] = toWorld(this.cam, this.w, this.h, sx, sy);
    this.cam = { k, cx: wx - (sx - this.w / 2) / k, cy: wy - (sy - this.h / 2) / k };
    this.camAnim = null;
    this.invalidate();
  }

  private flyTo(to: Camera) {
    this.camAnim = { from: { ...this.cam }, to, t0: performance.now() };
    this.invalidate();
  }

  private probe(sx: number, sy: number) {
    const [wx, wy] = toWorld(this.cam, this.w, this.h, sx, sy);
    const i = this.anim ? -1 : this.hit(wx, wy);
    const group = i < 0 && this.lay ? this.lay.groups.findIndex((g) => Math.hypot(wx - g.x, wy - g.y) <= g.r) : -1;
    return { i, group };
  }

  private local(e: PointerEvent | WheelEvent) {
    const r = this.canvas.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top] as const;
  }

  private onWheel = (e: WheelEvent) => {
    e.preventDefault();
    const [sx, sy] = this.local(e);
    this.zoomAt(sx, sy, Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0022)));
  };

  private onDown = (e: PointerEvent) => {
    this.canvas.setPointerCapture(e.pointerId);
    this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    this.drag = { moved: 0, pinch: this.pointers.size > 1 };
  };

  private onMove = (e: PointerEvent) => {
    const [sx, sy] = this.local(e);
    const prev = this.pointers.get(e.pointerId);
    if (prev) {
      if (this.pointers.size === 2) {
        const other = [...this.pointers.entries()].find(([id]) => id !== e.pointerId)![1];
        const d0 = Math.hypot(prev.x - other.x, prev.y - other.y);
        const d1 = Math.hypot(e.clientX - other.x, e.clientY - other.y);
        const [ox, oy] = this.local({ clientX: other.x, clientY: other.y } as PointerEvent);
        if (d0 > 0) this.zoomAt((sx + ox) / 2, (sy + oy) / 2, d1 / d0);
        this.drag.pinch = true;
      } else {
        const dx = e.clientX - prev.x,
          dy = e.clientY - prev.y;
        this.drag.moved += Math.abs(dx) + Math.abs(dy);
        if (this.drag.moved > 4) {
          this.cam = { ...this.cam, cx: this.cam.cx - dx / this.cam.k, cy: this.cam.cy - dy / this.cam.k };
          this.camAnim = null;
          this.invalidate();
        }
      }
      this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (this.drag.moved > 4 || this.drag.pinch) return;
    }
    if (e.pointerType === "touch") return;
    this.setHover(this.probe(sx, sy));
  };

  private onUp = (e: PointerEvent) => {
    this.pointers.delete(e.pointerId);
    if (this.drag.moved > 4 || this.drag.pinch) return;
    const [sx, sy] = this.local(e);
    const h = this.probe(sx, sy);
    if (h.i >= 0) this.select(h.i === this.selected ? -1 : h.i);
    else if (h.group >= 0 && this.lay) {
      const g = this.lay.groups[h.group];
      this.flyTo({ cx: g.x, cy: g.y, k: Math.min(this.w, this.h) / (g.r * 2.3) });
    } else this.select(-1);
  };

  private onCancel = (e: PointerEvent) => {
    this.pointers.delete(e.pointerId);
  };

  private onLeave = () => {
    this.setHover({ i: -1, group: -1 });
  };
}


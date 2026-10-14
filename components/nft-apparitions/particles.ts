import { lit, PIX } from "./pixels";

/** The fusion, in seconds: snarks appear, shatter, spiral in and become the Apparition. */
export const T = { appear: 0.5, stagger: 0.022, burst: 1.5, burstLen: 0.7, travel: 2.3, spread: 0.9, travelLen: 1.8 };
/** When the last particle has landed. */
export const DONE = T.travel + T.spread + T.travelLen + 0.1;

const VERT = `#version 300 es
in vec2 aStart;
in vec2 aEnd;
in vec2 aBurst;
in vec3 aColor;
in vec3 aEndColor;
in vec4 aP; // delay, role (1: becomes a pixel of the Apparition), snark, random
uniform float uT;
uniform vec2 uRes;
uniform vec2 uC;
uniform float uPs;
uniform float uPa;
uniform float uDpr;
out vec4 vColor;
float ease(float t) { t = clamp(t, 0.0, 1.0); return t * t * (3.0 - 2.0 * t); }
float easeOut(float t) { t = clamp(t, 0.0, 1.0); return 1.0 - pow(1.0 - t, 3.0); }
void main() {
  float role = aP.y;
  float appear = ease((uT - aP.z * ${T.stagger}) / ${T.appear});
  float burst = easeOut((uT - ${T.burst} - aP.w * 0.3) / ${T.burstLen});
  float travel = ease((uT - ${T.travel} - aP.x) / ${T.travelLen});
  vec2 p0 = aStart + aBurst * burst;
  // A spiral: angle and radius around the centre move together, plus one full turn (whole
  // turns only, so every pixel lands exactly on its spot).
  vec2 a = p0 - uC;
  vec2 b = aEnd - uC;
  float ta = atan(a.y, a.x);
  float tb = atan(b.y, b.x);
  float d = tb - ta;
  d -= 6.2831853 * floor((d + 3.14159265) / 6.2831853);
  d += 6.2831853;
  float ang = ta + d * travel;
  float rad = mix(length(a), length(b), travel);
  vec2 pos = uC + vec2(cos(ang), sin(ang)) * rad;
  // A little over a pixel, so neighbours touch without seams.
  float size = role > 0.5 ? mix(uPs + 0.6, uPa + 0.75, travel) : (uPs + 0.6) * (1.0 - 0.8 * travel);
  float alpha = appear * (role > 0.5 ? 1.0 : 1.0 - smoothstep(0.55, 1.0, travel));
  vec3 col = role > 0.5 ? mix(aColor, aEndColor, smoothstep(0.6, 1.0, travel)) : aColor;
  vColor = vec4(col * alpha, alpha);
  gl_Position = vec4(pos.x / uRes.x * 2.0 - 1.0, 1.0 - pos.y / uRes.y * 2.0, 0.0, 1.0);
  gl_PointSize = max(0.0, size * uDpr);
}`;

const FRAG = `#version 300 es
precision mediump float;
in vec4 vColor;
out vec4 o;
void main() { o = vColor; }`;

export interface Geometry {
  /** Apparition square: top-left and pixel size. */
  ax: number;
  ay: number;
  pa: number;
  /** Snark squares: top-left of each, and their pixel size. */
  snarks: [number, number][];
  ps: number;
}

/** Where everything sits in a `w` × `h` stage: the Apparition in the middle, the snarks on an
 *  ellipse around it, as large as they fit without touching. */
export function geometry(w: number, h: number, n: number): Geometry {
  const m = Math.min(w, h);
  const side = m * 0.42;
  let ss = m * 0.15;
  for (let i = 0; i < 3; i++) {
    const rx = w / 2 - ss / 2 - 10;
    const ry = h / 2 - ss / 2 - 10;
    const perimeter = Math.PI * (3 * (rx + ry) - Math.sqrt((3 * rx + ry) * (rx + 3 * ry)));
    ss = Math.min(m * 0.15, (perimeter / n) * 0.82);
  }
  const rx = w / 2 - ss / 2 - 10;
  const ry = h / 2 - ss / 2 - 10;
  const snarks: [number, number][] = Array.from({ length: n }, (_, k) => {
    const a = (k / n) * Math.PI * 2 - Math.PI / 2;
    return [w / 2 + Math.cos(a) * rx - ss / 2, h / 2 + Math.sin(a) * ry - ss / 2];
  });
  return { ax: w / 2 - side / 2, ay: h / 2 - side / 2, pa: side / PIX, snarks, ps: ss / PIX };
}

/** Seeded random numbers, so a fusion plays the same every time. */
function rng(seed: number) {
  let x = (seed * 2654435761) >>> 0 || 1;
  return () => {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    return (x >>> 0) / 4294967296;
  };
}

/** Particles for one Apparition: every lit pixel of its snarks. For each lit pixel of the
 *  Apparition, the snark pixel of the nearest colour flies to it; the others are absorbed. */
export function build(app: Uint8ClampedArray, snarks: Uint8ClampedArray[], g: Geometry, seed: number) {
  const rand = rng(seed);
  const src: { k: number; i: number }[] = [];
  snarks.forEach((p, k) => {
    for (let i = 0; i < PIX * PIX; i++) if (lit(p, i)) src.push({ k, i });
  });
  const n = src.length;
  const start = new Float32Array(n * 2);
  const end = new Float32Array(n * 2);
  const burst = new Float32Array(n * 2);
  const color = new Float32Array(n * 3);
  const endColor = new Float32Array(n * 3);
  const params = new Float32Array(n * 4);
  const cx = g.ax + (g.pa * PIX) / 2;
  const cy = g.ay + (g.pa * PIX) / 2;
  src.forEach(({ k, i }, j) => {
    const p = snarks[k];
    const [sx, sy] = g.snarks[k];
    const x = sx + ((i % PIX) + 0.5) * g.ps;
    const y = sy + (Math.floor(i / PIX) + 0.5) * g.ps;
    start.set([x, y], j * 2);
    // Shatter away from the snark's own centre.
    const dx = x - (sx + (PIX * g.ps) / 2);
    const dy = y - (sy + (PIX * g.ps) / 2);
    const f = 0.6 + rand() * 1.4;
    burst.set([dx * f + (rand() - 0.5) * g.ps * 6, dy * f + (rand() - 0.5) * g.ps * 6], j * 2);
    color.set([p[i * 3] / 255, p[i * 3 + 1] / 255, p[i * 3 + 2] / 255], j * 3);
    // Absorbed by default: into the heart of the Apparition.
    const r = rand() * g.pa * PIX * 0.25;
    const a = rand() * Math.PI * 2;
    end.set([cx + Math.cos(a) * r, cy + Math.sin(a) * r], j * 2);
    endColor.set(color.subarray(j * 3, j * 3 + 3), j * 3);
    params.set([rand() * T.spread, 0, k, rand()], j * 4);
  });

  // Nearest colour, pixels of the Apparition in a shuffled order so no area is favoured.
  const targets: number[] = [];
  for (let i = 0; i < PIX * PIX; i++) if (lit(app, i)) targets.push(i);
  for (let i = targets.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [targets[i], targets[j]] = [targets[j], targets[i]];
  }
  const used = new Uint8Array(n);
  for (const t of targets) {
    const r = app[t * 3];
    const gg = app[t * 3 + 1];
    const b = app[t * 3 + 2];
    let best = -1;
    let bestD = Infinity;
    for (let j = 0; j < n; j++) {
      if (used[j]) continue;
      const dr = color[j * 3] * 255 - r;
      const dg = color[j * 3 + 1] * 255 - gg;
      const db = color[j * 3 + 2] * 255 - b;
      const d = 2 * dr * dr + 4 * dg * dg + 3 * db * db;
      if (d < bestD) {
        bestD = d;
        best = j;
      }
    }
    if (best < 0) break;
    used[best] = 1;
    end.set([g.ax + ((t % PIX) + 0.5) * g.pa, g.ay + (Math.floor(t / PIX) + 0.5) * g.pa], best * 2);
    endColor.set([r / 255, gg / 255, b / 255], best * 3);
    params[best * 4 + 1] = 1;
  }
  return { n, start, end, burst, color, endColor, params };
}

export type Particles = ReturnType<typeof build>;

export class ParticleStage {
  private gl: WebGL2RenderingContext;
  private prog: WebGLProgram;
  private vao: WebGLVertexArrayObject;
  private bufs: WebGLBuffer[] = [];
  private n = 0;
  private u: Record<string, WebGLUniformLocation | null> = {};
  private raf = 0;
  private t0 = 0;
  private w = 0;
  private h = 0;
  private dpr = 1;
  private g: Geometry | null = null;
  /** Seconds into the fusion shown when still. */
  private still = 0;

  static supported(canvas: HTMLCanvasElement) {
    return !!canvas.getContext("webgl2", { premultipliedAlpha: true, antialias: false });
  }

  constructor(
    private canvas: HTMLCanvasElement,
    private onDone?: () => void,
  ) {
    const gl = canvas.getContext("webgl2", { premultipliedAlpha: true, antialias: false, preserveDrawingBuffer: true });
    if (!gl) throw new Error("WebGL2 unavailable");
    this.gl = gl;
    const sh = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? "shader");
      return s;
    };
    const p = gl.createProgram()!;
    gl.attachShader(p, sh(gl.VERTEX_SHADER, VERT));
    gl.attachShader(p, sh(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p) ?? "program");
    this.prog = p;
    for (const k of ["uT", "uRes", "uC", "uPs", "uPa", "uDpr"]) this.u[k] = gl.getUniformLocation(p, k);
    this.vao = gl.createVertexArray()!;
  }

  destroy() {
    cancelAnimationFrame(this.raf);
    const gl = this.gl;
    for (const b of this.bufs) gl.deleteBuffer(b);
    gl.deleteVertexArray(this.vao);
    gl.deleteProgram(this.prog);
  }

  resize(w: number, h: number) {
    this.w = w;
    this.h = h;
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.canvas.width = Math.round(w * this.dpr);
    this.canvas.height = Math.round(h * this.dpr);
    this.canvas.style.height = `${h}px`;
  }

  set(p: Particles, g: Geometry) {
    const gl = this.gl;
    this.g = g;
    for (const b of this.bufs) gl.deleteBuffer(b);
    this.bufs = [];
    gl.bindVertexArray(this.vao);
    const attr = (name: string, data: Float32Array, size: number) => {
      const loc = gl.getAttribLocation(this.prog, name);
      const b = gl.createBuffer()!;
      gl.bindBuffer(gl.ARRAY_BUFFER, b);
      gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0);
      this.bufs.push(b);
    };
    attr("aStart", p.start, 2);
    attr("aEnd", p.end, 2);
    attr("aBurst", p.burst, 2);
    attr("aColor", p.color, 3);
    attr("aEndColor", p.endColor, 3);
    attr("aP", p.params, 4);
    gl.bindVertexArray(null);
    this.n = p.n;
  }

  play() {
    cancelAnimationFrame(this.raf);
    this.t0 = performance.now();
    const step = (now: number) => {
      const t = (now - this.t0) / 1000;
      this.draw(t);
      if (t < DONE) this.raf = requestAnimationFrame(step);
      else {
        this.still = DONE;
        this.onDone?.();
      }
    };
    this.raf = requestAnimationFrame(step);
  }

  /** Shows one moment without animating (`DONE`: the Apparition formed). */
  show(t: number) {
    cancelAnimationFrame(this.raf);
    this.still = t;
    this.draw(t);
  }

  redraw() {
    this.draw(this.still);
  }

  private draw(t: number) {
    const gl = this.gl;
    const g = this.g;
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    if (!g || !this.n) return;
    gl.useProgram(this.prog);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.uniform1f(this.u.uT, t);
    gl.uniform2f(this.u.uRes, this.w, this.h);
    gl.uniform2f(this.u.uC, g.ax + (g.pa * PIX) / 2, g.ay + (g.pa * PIX) / 2);
    gl.uniform1f(this.u.uPs, g.ps);
    gl.uniform1f(this.u.uPa, g.pa);
    gl.uniform1f(this.u.uDpr, this.dpr);
    gl.bindVertexArray(this.vao);
    gl.drawArrays(gl.POINTS, 0, this.n);
    gl.bindVertexArray(null);
  }
}

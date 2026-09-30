import type { Camera } from "./draw";

const VERT = `#version 300 es
layout(location = 0) in vec2 corner;
layout(location = 1) in vec4 inst; // x, y, size, alpha
layout(location = 2) in float slot;
uniform vec2 center;
uniform float zoom;
uniform vec2 view;
uniform float cols;
uniform vec2 cellUV;
out vec2 uv;
out float alpha;
out vec2 local;
void main() {
  vec2 world = inst.xy + (corner - 0.5) * inst.z;
  vec2 px = (world - center) * zoom + view * 0.5;
  vec2 clip = px / view * 2.0 - 1.0;
  gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);
  uv = (vec2(mod(slot, cols), floor(slot / cols)) + corner) * cellUV;
  alpha = inst.w;
  local = corner * 2.0 - 1.0;
}`;

const FRAG = `#version 300 es
precision mediump float;
uniform sampler2D tex;
uniform float round;
in vec2 uv;
in float alpha;
in vec2 local;
out vec4 color;
void main() {
  if (round > 0.5 && dot(local, local) > 1.0) discard;
  vec4 c = texture(tex, uv);
  color = vec4(c.rgb * alpha, alpha);
}`;

function hex(c: string): [number, number, number] {
  const n = parseInt(c.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

/** Every thumbnail in one instanced WebGL2 draw call: 10,000 items animate at full frame rate,
 *  where as many 2D drawImage calls take hundreds of milliseconds per frame. */
export class SpriteLayer {
  private gl: WebGL2RenderingContext | null;
  private prog: WebGLProgram | null = null;
  private inst: WebGLBuffer | null = null;
  private slots: WebGLBuffer | null = null;
  private tex: WebGLTexture | null = null;
  private data = new Float32Array(0);
  private n = 0;
  private u: Record<string, WebGLUniformLocation | null> = {};
  private atlas: { w: number; h: number; cell: number; cols: number } | null = null;

  constructor(
    private canvas: HTMLCanvasElement,
    private bg: string,
  ) {
    this.gl = canvas.getContext("webgl2", { antialias: false, premultipliedAlpha: true, preserveDrawingBuffer: false });
    if (this.gl) this.init(this.gl);
  }

  /** False when WebGL2 isn't available: the 2D canvas draws the thumbnails instead. */
  get ok() {
    return !!this.gl && !!this.prog;
  }

  private init(gl: WebGL2RenderingContext) {
    const shader = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null;
    };
    const vs = shader(gl.VERTEX_SHADER, VERT),
      fs = shader(gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return;
    const prog = gl.createProgram()!;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
    this.prog = prog;
    for (const k of ["center", "zoom", "view", "cols", "cellUV", "tex", "round"]) this.u[k] = gl.getUniformLocation(prog, k);

    const quad = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

    this.inst = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.inst);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 0, 0);
    gl.vertexAttribDivisor(1, 1);

    this.slots = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.slots);
    gl.enableVertexAttribArray(2);
    gl.vertexAttribPointer(2, 1, gl.FLOAT, false, 0, 0);
    gl.vertexAttribDivisor(2, 1);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  }

  /** Each item's atlas slot (item n at n - 1). */
  setItems(ids: number[]) {
    const gl = this.gl;
    if (!gl || !this.prog) return;
    this.n = ids.length;
    this.data = new Float32Array(ids.length * 4);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.slots);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(ids.map((id) => id - 1)), gl.STATIC_DRAW);
  }

  setAtlas(img: HTMLImageElement, cell: number, cols: number) {
    const gl = this.gl;
    if (!gl || !this.prog) return;
    if (!this.tex) this.tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.tex);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
    gl.generateMipmap(gl.TEXTURE_2D);
    // Smooth when small, crisp pixels when zoomed in (the art is pixel art).
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    this.atlas = { w: img.naturalWidth, h: img.naturalHeight, cell, cols };
  }

  resize(w: number, h: number, dpr: number) {
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
  }

  draw(w: number, h: number, cam: Camera, x: Float32Array, y: Float32Array, s: Float32Array, alpha: Float32Array | null, round: boolean) {
    const gl = this.gl;
    if (!gl || !this.prog) return;
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    const [r, g, b] = hex(this.bg);
    gl.clearColor(r, g, b, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    if (!this.atlas || !this.tex || !this.n) return;
    const d = this.data;
    for (let i = 0; i < this.n; i++) {
      d[i * 4] = x[i];
      d[i * 4 + 1] = y[i];
      d[i * 4 + 2] = s[i];
      d[i * 4 + 3] = alpha ? alpha[i] : 1;
    }
    gl.useProgram(this.prog);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.inst);
    gl.bufferData(gl.ARRAY_BUFFER, d, gl.DYNAMIC_DRAW);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.tex);
    gl.uniform1i(this.u.tex, 0);
    gl.uniform2f(this.u.center, cam.cx, cam.cy);
    gl.uniform1f(this.u.zoom, cam.k);
    gl.uniform2f(this.u.view, w, h);
    gl.uniform1f(this.u.cols, this.atlas.cols);
    gl.uniform2f(this.u.cellUV, this.atlas.cell / this.atlas.w, this.atlas.cell / this.atlas.h);
    gl.uniform1f(this.u.round, round ? 1 : 0);
    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, this.n);
  }
}

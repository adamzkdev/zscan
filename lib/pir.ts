/**
 * ZScan Private: private lookups of Zcash transactions and transparent addresses with PIR
 * (Private Information Retrieval, YPIR+SP). The server answers without learning which
 * transaction or address was asked; it only sees that a lookup happened (see docs/PIR.md in
 * the zscan-api repository).
 *
 * Dependency-free. Needs the generated `zscan_pir.js` (+ `zscan_pir.d.ts`) next to this file and
 * `zscan_pir_bg.wasm` served at `wasmUrl` (default `/wasm/zscan_pir_bg.wasm`). Works in browsers
 * (main thread or worker), Next.js / Vite client code, and Node 18+.
 *
 * - `pirAvailable()` is cheap (no WASM download): WebAssembly + crypto present and the server
 *   publishes at least one database.
 * - `privateTx` / `privateAddress` resolve `{ found: false, snapshotHeight }` when the key is not
 *   in the database and throw on malformed input, transport or protocol errors. Amounts are
 *   zatoshis, times unix seconds, heights block heights.
 * - The looked-up value never leaves this module in clear: requests carry only the encrypted
 *   query (POST body ~0.9-1.3 MB), never the txid/address in a URL, header or body.
 */

import init, { prepare, type InitInput } from "./zscan_pir.js";

export type PrivateTxResult = {
  found: boolean;
  height?: number;
  /** Unix seconds. */
  time?: number;
  /** Position of the transaction in its block. */
  index?: number;
  /** Zatoshis; absent for coinbase transactions. */
  fee?: number;
  size?: number;
  /** Chain height the answer reflects. */
  snapshotHeight: number;
  /** Extension: seen in the mempool, not mined yet (then `found` is false). */
  pending?: boolean;
};

export type PrivateAddressResult = {
  found: boolean;
  balance?: number;
  received?: number;
  sent?: number;
  txCount?: number;
  firstHeight?: number;
  lastHeight?: number;
  snapshotHeight: number;
  /** Extension: unix seconds of the last activity. */
  lastTime?: number;
  /** Extension: "nonzero-balance" when the server only holds funded addresses (then "not found" also means "empty"). */
  scope?: string;
};

export type PirConfig = {
  /** API origin; "" for same-origin `/v1/pir/*` (the proxy must forward binary bodies as bytes). */
  apiBase: string;
  /** Where `zscan_pir_bg.wasm` is served (or its bytes / a compiled module, e.g. in Node). */
  wasmUrl: string | URL | ArrayBuffer | Uint8Array | WebAssembly.Module;
  /** Per-request timeout, ms. */
  timeoutMs: number;
  fetch: typeof fetch;
};

type DbInfo = {
  epoch: number;
  rows: number;
  records: number;
  snapshot_height: number;
  query_bytes: number;
  response_bytes: number;
  scope?: string;
  [k: string]: unknown;
};

export type PirParams = {
  version: number;
  scheme: string;
  network: string;
  tx: DbInfo | null;
  address: DbInfo | null;
};

type Mempool = {
  height: number;
  txids: string[];
  recent_from: number;
  /** [txid, height, index, time, fee | null, size] */
  recent: [string, number, number, number, number | null, number][];
};

const config: PirConfig = {
  apiBase: "https://api.zscan.cash",
  wasmUrl: "/wasm/zscan_pir_bg.wasm",
  timeoutMs: 30_000,
  fetch: (...args) => globalThis.fetch(...args),
};

let wasmReady: Promise<unknown> | null = null;
let paramsCache: { at: number; params: PirParams } | null = null;
let mempoolCache: { at: number; m: Mempool } | null = null;

/** Overrides defaults (API origin, WASM location, fetch, timeout). Clears caches. */
export function configurePir(opts: Partial<PirConfig>): void {
  Object.assign(config, opts);
  paramsCache = null;
  mempoolCache = null;
  if (opts.wasmUrl) wasmReady = null;
}

function loadWasm(): Promise<unknown> {
  wasmReady ??= init({ module_or_path: config.wasmUrl as InitInput }).catch((e: unknown) => {
    wasmReady = null;
    throw e;
  });
  return wasmReady;
}

async function request(path: string, init?: RequestInit, tries = 3): Promise<Response> {
  for (let i = 0; ; i++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), config.timeoutMs);
    let res: Response;
    try {
      res = await config.fetch(`${config.apiBase}${path}`, { ...init, signal: ctrl.signal, cache: "no-store" });
    } catch (e) {
      clearTimeout(timer);
      if (i + 1 >= tries) throw new Error(`PIR server unreachable: ${e instanceof Error ? e.message : String(e)}`);
      await sleep(500 * 2 ** i);
      continue;
    }
    clearTimeout(timer);
    // 503 = busy or building, 429 = rate limited: back off and retry.
    if ((res.status === 503 || res.status === 429) && i + 1 < tries) {
      const after = Number(res.headers.get("retry-after"));
      await sleep(Number.isFinite(after) && after > 0 ? Math.min(after, 10) * 1000 : 1000 * 2 ** i);
      continue;
    }
    return res;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function failure(res: Response): Promise<Error> {
  let message = `${res.status} ${res.statusText}`;
  try {
    message = ((await res.json()) as { message?: string }).message ?? message;
  } catch {
    /* not JSON */
  }
  return new Error(message);
}

/** Server parameters (databases, snapshot heights, sizes). Cached 30 s. */
export async function pirParams(force = false): Promise<PirParams> {
  if (!force && paramsCache && Date.now() - paramsCache.at < 30_000) return paramsCache.params;
  const res = await request("/v1/pir/params");
  if (!res.ok) throw await failure(res);
  const params = (await res.json()) as PirParams;
  paramsCache = { at: Date.now(), params };
  return params;
}

export async function pirAvailable(): Promise<boolean> {
  try {
    if (typeof WebAssembly !== "object" || typeof WebAssembly.instantiate !== "function") return false;
    if (typeof globalThis.crypto?.getRandomValues !== "function") return false;
    const p = await pirParams(true);
    return p.version === 1 && p.scheme === "ypir-sp" && !!(p.tx || p.address);
  } catch {
    return false;
  }
}

/** The whole mempool and the transactions mined above the PIR snapshot (public). Cached 10 s. */
async function mempool(): Promise<Mempool | null> {
  if (mempoolCache && Date.now() - mempoolCache.at < 10_000) return mempoolCache.m;
  try {
    const res = await request("/v1/pir/mempool", undefined, 2);
    if (!res.ok) return null;
    const m = (await res.json()) as Mempool;
    mempoolCache = { at: Date.now(), m };
    return m;
  } catch {
    return null;
  }
}

async function lookup(db: "tx" | "address", key: string): Promise<Record<string, unknown>> {
  await loadWasm();
  for (let attempt = 0; attempt < 2; attempt++) {
    const params = await pirParams(attempt > 0);
    const info = params[db];
    if (!info) throw new Error("Private lookups are not available right now (the database is being built)");
    // Throws on a malformed key, before anything is sent.
    const l = prepare(db, JSON.stringify(info), key);
    try {
      // No Content-Type: a CORS "simple" request, no preflight.
      const res = await request(`/v1/pir/query/${db}`, { method: "POST", body: l.takeBody() as BodyInit });
      if (res.status === 409) continue; // database rebuilt: refetch parameters
      if (!res.ok) throw await failure(res);
      const out = l.finish(new Uint8Array(await res.arrayBuffer()));
      return JSON.parse(out) as Record<string, unknown>;
    } catch (e) {
      if (e instanceof Error && e.message === "stale-epoch") continue;
      throw e;
    } finally {
      l.free();
    }
  }
  throw new Error("The private database changed during the lookup; try again");
}

const TXID = /^[0-9a-fA-F]{64}$/;

export async function privateTx(txid: string): Promise<PrivateTxResult> {
  const id = txid.trim().toLowerCase();
  if (!TXID.test(id)) throw new Error("A transaction id is 64 hexadecimal characters");
  // Both requests are made for every lookup, whatever the answer, so the traffic doesn't depend
  // on where the transaction is.
  const [r, m] = await Promise.all([lookup("tx", id), mempool()]);
  const snapshotHeight = r.snapshotHeight as number;
  if (r.found) {
    return {
      found: true,
      height: r.height as number,
      time: r.time as number,
      index: r.index as number,
      fee: (r.fee as number | null) ?? undefined,
      size: r.size as number,
      snapshotHeight,
    };
  }
  const recent = m?.recent.find((t) => t[0] === id);
  if (recent) {
    const [, height, index, time, fee, size] = recent;
    return { found: true, height, index, time, fee: fee ?? undefined, size, snapshotHeight: m!.height };
  }
  if (m?.txids.includes(id)) return { found: false, pending: true, snapshotHeight };
  return { found: false, snapshotHeight };
}

export async function privateAddress(address: string): Promise<PrivateAddressResult> {
  const a = address.trim();
  if (!/^[A-Za-z0-9]{20,128}$/.test(a)) throw new Error("Not a transparent address");
  const r = await lookup("address", a);
  const scope = paramsCache?.params.address?.scope;
  const snapshotHeight = r.snapshotHeight as number;
  if (!r.found) return { found: false, snapshotHeight, ...(scope && scope !== "all" ? { scope } : {}) };
  return {
    found: true,
    balance: r.balance as number,
    received: r.received as number,
    sent: r.sent as number,
    txCount: r.txCount as number,
    firstHeight: r.firstHeight as number,
    lastHeight: r.lastHeight as number,
    lastTime: r.lastTime as number,
    snapshotHeight,
  };
}

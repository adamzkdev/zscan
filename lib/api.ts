import "server-only";

/** Our apps' shared token: the API trusts their server-side requests (see INTERNAL_API_TOKEN). */
const INTERNAL = process.env.INTERNAL_API_TOKEN ? { "x-zscan-internal": process.env.INTERNAL_API_TOKEN } : undefined;

const BASE = process.env.API_INTERNAL_URL ?? "http://127.0.0.1:8080";

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

const TIMEOUT_MS = Number(process.env.API_TIMEOUT_MS ?? 10_000);

/** One GET with a deadline; a network error, timeout or 502/503/504 is tried once more. */
async function fetchApi(url: string): Promise<Response> {
  for (let attempt = 0; ; attempt++) {
    try {
      const res = await fetch(url, { cache: "no-store", headers: INTERNAL, signal: AbortSignal.timeout(TIMEOUT_MS) });
      if (attempt === 0 && [502, 503, 504].includes(res.status)) throw new Error(`HTTP ${res.status}`);
      return res;
    } catch (e) {
      if (attempt >= 1) throw e;
      await new Promise((r) => setTimeout(r, 300));
    }
  }
}

/** Data every page asks for and that doesn't change per block: kept this many ms per path, so
 * crawlers walking thousands of pages don't turn each render into the same API calls. */
const SHARED: [RegExp, number][] = [
  [/^\/v1\/(price|network)$/, 15_000],
  [/^\/v1\/price\/history$/, 300_000],
  [/^\/v1\/collections\/[\w-]+$/, 30_000],
  [/^\/v1\/collections\/[\w-]+\/stats$/, 60_000],
  [/^\/v1\/collections\/[\w-]+\/apparitions$/, 300_000],
];
const shared = new Map<string, { at: number; value: Promise<unknown> }>();

async function load<T>(path: string): Promise<T> {
  const res = await fetchApi(`${BASE}${path}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, body.error ?? "error", body.message ?? res.statusText);
  }
  return res.json() as Promise<T>;
}

/** Server-side fetch from the ZScan API. Fresh, except the shared paths above. */
export async function api<T>(path: string): Promise<T> {
  const ttl = SHARED.find(([re]) => re.test(path))?.[1];
  if (!ttl) return load<T>(path);
  const hit = shared.get(path);
  if (hit && Date.now() - hit.at < ttl) return hit.value as Promise<T>;
  // Concurrent renders share the one request in flight; a failure is not kept.
  const value = load<T>(path);
  shared.set(path, { at: Date.now(), value });
  value.catch(() => shared.get(path)?.value === value && shared.delete(path));
  return value;
}

/** Like `api`, but returns null on 404 / 400 so pages can render notFound or a message. */
export async function apiOrNull<T>(path: string): Promise<T | null> {
  try {
    return await api<T>(path);
  } catch (e) {
    if (e instanceof ApiError && (e.status === 404 || e.status === 400)) return null;
    throw e;
  }
}

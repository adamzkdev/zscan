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

/** Server-side fetch from the ZScan API. Always fresh: explorer data changes every block. */
export async function api<T>(path: string): Promise<T> {
  const res = await fetchApi(`${BASE}${path}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, body.error ?? "error", body.message ?? res.statusText);
  }
  return res.json() as Promise<T>;
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

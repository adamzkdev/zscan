/** Browser calls to the ZScan API through this site's /v1 proxy. */
export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

/** Fetch JSON from the API, turning its error body ({ error, message }) into an ApiError. */
export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: init?.body ? { "content-type": "application/json", ...init.headers } : init?.headers,
    signal: init?.signal ?? AbortSignal.timeout(15_000),
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(body?.error ?? `http_${res.status}`, body?.message ?? `HTTP ${res.status}`);
  return body as T;
}

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
  if (!res.ok) {
    const code = body && typeof body === "object" && "error" in body && typeof body.error === "string" ? body.error : `http_${res.status}`;
    const message = body && typeof body === "object" && "message" in body && typeof body.message === "string" ? body.message : `HTTP ${res.status}`;
    throw new ApiError(code, message);
  }
  return body as T;
}

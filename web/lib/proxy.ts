import "server-only";

const API = () => process.env.API_INTERNAL_URL ?? "http://127.0.0.1:8080";

/** Forwards a request to the ZScan API, preserving method, query, body and status. */
export async function proxy(req: Request, path: string): Promise<Response> {
  const url = new URL(req.url);
  const upstream: Record<string, string> = { accept: req.headers.get("accept") ?? "*/*" };
  // Pass the visitor's address so the API rate-limits browsers individually. Only the last hop
  // (appended by our reverse proxy) is trustworthy; earlier entries are whatever the client sent.
  const client = req.headers.get("x-forwarded-for")?.split(",").pop()?.trim() || req.headers.get("x-real-ip");
  if (client) upstream["x-forwarded-for"] = client;
  const init: RequestInit = { method: req.method, cache: "no-store", headers: upstream };
  if (req.method !== "GET" && req.method !== "HEAD") {
    init.body = await req.text();
    (init.headers as Record<string, string>)["content-type"] = req.headers.get("content-type") ?? "application/json";
  }
  const res = await fetch(`${API()}${path}${url.search}`, init);
  const headers = new Headers();
  for (const h of ["content-type", "content-disposition", "cache-control"]) {
    const v = res.headers.get(h);
    if (v) headers.set(h, v);
  }
  return new Response(res.body, { status: res.status, headers });
}

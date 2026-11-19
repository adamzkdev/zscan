import "server-only";

const API = () => process.env.API_INTERNAL_URL ?? "http://127.0.0.1:8080";

/** Forwards a request to the ZScan API, preserving method, query, body and status. */
export async function proxy(req: Request, path: string): Promise<Response> {
  const url = new URL(req.url);
  // Let Cloudflare negotiate compression at the edge. Recompressing a Worker fetch stream
  // using the Node path can send gzip bytes without a matching Content-Encoding header.
  const upstream: Record<string, string> = { accept: req.headers.get("accept") ?? "*/*", "accept-encoding": "identity" };
  // Cloudflare supplies this address; visitor-supplied forwarding headers are not trusted.
  const client = req.headers.get("cf-connecting-ip");
  if (client) upstream["x-forwarded-for"] = client;
  // Our token makes the API trust the forwarded address even if it can't tell this server is ours.
  if (process.env.INTERNAL_API_TOKEN) upstream["x-zscan-internal"] = process.env.INTERNAL_API_TOKEN;
  // Compact-block downloads (in-browser viewing-key scans) may stream for a while; everything
  // else answers well within the API's own 30 s limit.
  const long = path.startsWith("/v1/compact") || path.endsWith("/shielded") || path === "/v1/ws";
  const init: RequestInit = {
    method: req.method,
    cache: "no-store",
    headers: upstream,
    ...(long ? {} : { signal: AbortSignal.timeout(35_000) }),
  };
  if (req.method !== "GET" && req.method !== "HEAD") {
    init.body = await req.text();
    (init.headers as Record<string, string>)["content-type"] = req.headers.get("content-type") ?? "application/json";
  }
  let res: Response;
  try {
    res = await fetch(`${API()}${path}${url.search}`, init);
  } catch {
    return Response.json({ error: "unavailable", message: "The API didn't answer; try again" }, { status: 503 });
  }
  const headers = new Headers();
  // Inscription content relies on the API's sandbox headers to stay isolated from this origin.
  for (const h of [
    "content-type",
    "content-encoding",
    "content-disposition",
    "cache-control",
    "content-security-policy",
    "x-content-type-options",
    "cross-origin-resource-policy",
  ]) {
    const v = res.headers.get(h);
    if (v) headers.set(h, v);
  }
  return new Response(res.body, { status: res.status, headers });
}

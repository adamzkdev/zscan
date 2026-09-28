import { proxy } from "@/lib/proxy";

export const dynamic = "force-dynamic";

export function GET(req: Request) {
  return proxy(req, "/openapi.json");
}

import { proxy } from "@/lib/proxy";

export const dynamic = "force-dynamic";

async function handle(req: Request, ctx: RouteContext<"/v1/[...path]">) {
  const { path } = await ctx.params;
  return proxy(req, `/v1/${path.map(encodeURIComponent).join("/")}`);
}

export const GET = handle;
export const POST = handle;

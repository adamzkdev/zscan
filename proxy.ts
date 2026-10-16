import { NextResponse, type NextRequest } from "next/server";
import { BLOCKED_BOTS } from "@/lib/bots";

const BLOCKED = new RegExp(BLOCKED_BOTS.join("|"), "i");
// Self-declared bots, kept off the heavy pages (a CSV walks an address's whole history).
const BOT = /bot|crawler|spider|slurp/i;

/** Refuses scrapers that ignore robots.txt before a page render calls the API. */
export function proxy(req: NextRequest) {
  const ua = req.headers.get("user-agent") ?? "";
  const p = req.nextUrl;
  // any self-declared bot: no CSV exports, no filtered or sorted collection views
  const heavy = p.pathname.endsWith("/csv") || (p.pathname.startsWith("/collection") && p.search !== "");
  if (BLOCKED.test(ua) || (BOT.test(ua) && heavy)) {
    return new NextResponse("Crawling disallowed, see /robots.txt\n", {
      status: 403,
      headers: { "content-type": "text/plain" },
    });
  }
  return NextResponse.next();
}

export const config = {
  // Static assets and robots.txt itself stay reachable.
  matcher: ["/((?!_next/|robots.txt|favicon.ico|icon.svg|apple-icon.png|brand/).*)"],
};

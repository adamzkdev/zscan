import type { MetadataRoute } from "next";
import { BLOCKED_BOTS } from "@/lib/bots";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: BLOCKED_BOTS, disallow: "/" },
      // Search engines and AI assistants: pages yes, raw API and CSV exports no.
      { userAgent: "*", allow: "/", disallow: ["/v1/", "/api-docs"] },
    ],
    host: "https://zscan.cash",
  };
}

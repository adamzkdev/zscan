import type { MetadataRoute } from "next";
import { BLOCKED_BOTS } from "@/lib/bots";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: BLOCKED_BOTS, disallow: "/" },
      // Search engines and AI assistants: pages yes, raw API and CSV exports no.
      // Filtered/sorted views (trait combinations are endless) and raw API stay out of crawls.
      { userAgent: "*", allow: "/", disallow: ["/v1/", "/api-docs", "/*?*traits=", "/*?*sort=", "/*?*tab="] },
    ],
    host: "https://zscan.cash",
  };
}

import type { NextConfig } from "next";
import { TOOL_REDIRECTS } from "./lib/tools/list";

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  async redirects() {
    return [
      { source: "/funding", destination: "/treasury", permanent: true },
      // Former one-tool pages: each tool is now a section of a grouped page.
      ...TOOL_REDIRECTS.map((r) => ({ source: `/tools/${r.id}`, destination: r.to, permanent: true })),
    ];
  },
  // The API proxy lives in route handlers (app/v1, app/openapi.json, app/api-docs) so its target
  // is read at runtime: one image serves mainnet and testnet.
};

export default nextConfig;

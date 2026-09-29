import type { NextConfig } from "next";
import { TOOL_REDIRECTS } from "./lib/tools/list";

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  async redirects() {
    return [
      { source: "/funding", destination: "/treasury", permanent: true },
      // Former tool URLs.
      ...TOOL_REDIRECTS.map((r) => ({ source: r.from, destination: r.to, permanent: true })),
    ];
  },
  // The API proxy lives in route handlers (app/v1, app/openapi.json, app/api-docs) so its target
  // is read at runtime: one image serves mainnet and testnet.
};

export default nextConfig;

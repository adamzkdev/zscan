import type { NextConfig } from "next";

/// The tools moved to ZScan Developers (same slugs); only the viewing-key scanner stays here.
const DEVELOPERS_URL = (process.env.NEXT_PUBLIC_DEVELOPERS_URL ?? "https://developers.zscan.cash").replace(/\/$/, "");

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  async redirects() {
    return [
      { source: "/funding", destination: "/treasury", permanent: true },
      { source: "/tools", destination: DEVELOPERS_URL, permanent: true },
      { source: "/tools/:slug", destination: `${DEVELOPERS_URL}/tools/:slug`, permanent: true },
    ];
  },
  // The API proxy lives in route handlers (app/v1, app/openapi.json, app/api-docs) so its target
  // is read at runtime: one image serves mainnet and testnet.
};

export default nextConfig;

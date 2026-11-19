import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import vinext from "vinext";
import { cloudflare } from "@cloudflare/vite-plugin";

export default defineConfig({
  // every Link without prefetching unless asked (lib/link.tsx)
  resolve: { alias: [{ find: /^next\/link$/, replacement: fileURLToPath(new URL("./lib/link.tsx", import.meta.url)) }] },
  plugins: [
    vinext(),
    cloudflare({
      viteEnvironment: {
        name: "rsc",
        childEnvironments: ["ssr"],
      },
    }),
  ],
});

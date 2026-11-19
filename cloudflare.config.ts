import { bindings, defineConfig, defineWorker } from "cf/config";

export default defineConfig({
  accountId: "b4461addee108efc79385b2d447b25a5",
  worker: defineWorker({
    name: "zscan",
    entrypoint: "vinext/server/fetch-handler",
    compatibilityDate: "2026-11-12",
    compatibilityFlags: ["nodejs_compat"],
    workersDev: true,
    previewUrls: false,
    observability: { enabled: true, redactQueryString: true, logs: { invocationLogs: false }, traces: { enabled: false } },
    assets: {
      htmlHandling: "none",
      notFoundHandling: "none",
      runWorkerFirst: ["/*", "!/_next/static/*", "!/*/_next/static/*"],
    },
    env: {
      ASSETS: bindings.assets(),
    },
  }),
});

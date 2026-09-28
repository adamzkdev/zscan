import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Vendored third-party bundles.
    "public/vendor/**",
    // wasm-bindgen output (scripts/build-wasm.sh).
    "public/wasm/zscan_wasm.js",
    // Not part of the app: the scanner's Rust sources and the media-kit generator.
    "wasm/**",
    "brand/**",
  ]),
]);

export default eslintConfig;

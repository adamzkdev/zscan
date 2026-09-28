#!/usr/bin/env bash
# Builds the viewing-key scanner (wasm/) into public/wasm/, where the browser loads it.
# Needs the wasm32-unknown-unknown target and wasm-bindgen-cli matching wasm/Cargo.toml:
#   rustup target add wasm32-unknown-unknown
#   cargo install wasm-bindgen-cli --version 0.2.100 --locked
set -euo pipefail
cd "$(dirname "$0")/../wasm"
cargo build --release --target wasm32-unknown-unknown
wasm-bindgen --target web --no-typescript --out-dir ../public/wasm \
  target/wasm32-unknown-unknown/release/zscan_wasm.wasm
if command -v wasm-opt >/dev/null; then
  wasm-opt -O3 -o ../public/wasm/zscan_wasm_bg.wasm ../public/wasm/zscan_wasm_bg.wasm
fi
ls -la ../public/wasm

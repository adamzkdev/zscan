# ZScan

Open Zcash block explorer — **[zscan.cash](https://zscan.cash)**.

Blocks, transactions (v1–v6, including Ironwood), addresses, mempool, shielded pools, the Orchard → Ironwood
migration, supply audit, dev fund, NFT collections, bridges, ZIPs and a client-side viewing-key scanner.
Privacy-respecting: no IP logs, no ads, no cookies. MIT licensed.

ZScan is split into one repo per subdomain:

| Subdomain | Repo |
|---|---|
| `zscan.cash` (explorer) | `zscan` (this repo) |
| `api.zscan.cash` (indexer + data API) | `zscan-api` |
| `ai.zscan.cash` | `zscan-ai` |
| `stats.zscan.cash` | `zscan-stats` |
| `news.zscan.cash` | `zscan-news` |
| `chat.zscan.cash` | `zscan-chat` |
| `developers.zscan.cash` | `zscan-developers` |

## Layout

```
app/, components/, lib/   Next.js 16 frontend (SSR), Recharts
public/wasm/              viewing-key scanner, built from wasm/ by scripts/build-wasm.sh (artifacts committed)
wasm/                     Rust crate for the scanner (trial-decrypts compact blocks in the browser)
brand/                    media kit sources (files served from public/brand/)
```

## Run locally

Needs a running [zscan-api](https://api.zscan.cash/docs), local or public:

```bash
npm install
API_INTERNAL_URL=https://api.zscan.cash npm run dev     # http://localhost:3000
```

The full stack in Docker (indexer, API, Postgres, this explorer) is in `zscan-api`: clone both repos side by side
(`zcash/api` and `zcash/scan`) and run `docker compose up -d --build` from `api/`.

## Configuration

| Variable | Default |
|---|---|
| `API_INTERNAL_URL` | `http://127.0.0.1:8080` (read at runtime) |
| `API_TIMEOUT_MS` | 10000 (server-side API calls; one retry on network errors and 502/503/504) |
| `ZSCAN_NETWORK`, `PUBLIC_WS_URL`, `MAINNET_URL`, `TESTNET_URL` | network badge, live events, network switcher |

## Tests

```bash
npx tsc --noEmit && npm run lint && npm run build
```

import type { Metadata } from "next";
import { Card, PageTitle } from "@/components/ui";
import { DEVELOPERS_URL } from "@/lib/nav";

export const metadata: Metadata = {
  title: "Developer API",
  description: "Free public REST API for Zcash: blocks, transactions, addresses, value pools, Ironwood migration and live events.",
};

const ENDPOINTS: [string, string, string][] = [
  ["GET", "/v1/blocks", "Latest blocks (paginate with ?before=)"],
  ["GET", "/v1/blocks/{height|hash}", "Block with its transactions"],
  ["GET", "/v1/tx/{txid}", "Decoded transaction, including Ironwood actions"],
  ["GET", "/v1/txs?kind=migration", "Latest transactions, filterable by type"],
  ["GET", "/v1/address/{t-addr}", "Balance and activity of a transparent address"],
  ["GET", "/v1/pools", "Current balance of every value pool"],
  ["GET", "/v1/pools/history?interval=day", "Pool balances over time"],
  ["GET", "/v1/ironwood/migration", "Orchard → Ironwood migration progress"],
  ["GET", "/v1/mempool", "Unconfirmed transactions"],
  ["GET", "/v1/network", "Hashrate, difficulty and 24h activity"],
  ["GET", "/v1/stats/daily", "Daily transaction counts by type"],
  ["GET", "/v1/miners?period=24h", "Top miners and mining pools by blocks found"],
  ["GET", "/v1/accounts", "Top transparent accounts by balance"],
  ["GET", "/v1/price", "ZEC price, market cap and 14-day history"],
  ["GET", "/v1/supply", "Supply, issuance split, inflation, fee burn, halving"],
  ["GET", "/v1/supply/audit", "Independent block-by-block supply reconciliation"],
  ["GET", "/v1/funding", "Dev fund flows: ZCG and coinholder fund"],
  ["GET", "/v1/privacy/anonymity-sets", "Notes per shielded pool and daily growth"],
  ["GET", "/v1/fees", "ZIP-317 fee tracker and mempool conditions"],
  ["GET", "/v1/unified/{ua}", "Decode a Unified Address into its receivers"],
  ["GET", "/v1/address/{t-addr}/csv", "Address history as CSV"],
  ["GET", "/v1/health", "Indexer health and chain reorganizations"],
  ["GET", "/v1/search?q=", "Resolve a height, hash, txid or address"],
  ["POST", "/v1/tx/broadcast", "Broadcast a signed raw transaction"],
  ["WS", "/v1/ws", "Live new blocks and mempool events"],
];

export default function DevelopersPage() {
  return (
    <div className="space-y-6">
      <PageTitle eyebrow="Build on Zcash" title="Developer API">
        A free, open REST API for Zcash data. No key required. Amounts are in zatoshis (1 ZEC = 100,000,000 zat).
        Anonymous requests are rate-limited per IP.
      </PageTitle>
      <div className="flex flex-wrap gap-2">
        <a href="/api-docs" className="rounded-lg bg-link px-4 py-2 text-sm font-medium text-white hover:bg-link-hover">
          Interactive reference
        </a>
        <a href="/openapi.json" className="rounded-lg border border-border px-4 py-2 text-sm text-muted hover:text-text">
          OpenAPI spec
        </a>
        <a href={DEVELOPERS_URL} className="rounded-lg border border-border px-4 py-2 text-sm text-muted hover:text-text">
          Developer tools
        </a>
      </div>
      <Card title="Quick start">
        <pre className="overflow-x-auto rounded-lg bg-bg p-4 font-mono text-sm text-muted">
{`curl https://zscan.cash/v1/ironwood/migration

# live events
websocat wss://zscan.cash/v1/ws`}
        </pre>
      </Card>
      <Card title="Endpoints" pad={false}>
        <ul className="divide-y divide-border">
          {ENDPOINTS.map(([m, p, d]) => (
            <li key={p} className="grid gap-1 px-4 py-2.5 text-sm md:grid-cols-[60px_320px_1fr] md:items-center">
              <span className={`font-mono text-xs font-semibold ${m === "GET" ? "text-ironwood" : m === "POST" ? "text-accent" : "text-sapling"}`}>{m}</span>
              <code className="font-mono">{p}</code>
              <span className="text-muted">{d}</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

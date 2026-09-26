export type NavItem = { href: string; label: string; desc?: string; external?: boolean };
export type NavMenu = { label: string; href?: string; items?: NavItem[] };

export const NAV: NavMenu[] = [
  { label: "Home", href: "/" },
  {
    label: "Blockchain",
    items: [
      { href: "/txs", label: "Transactions", desc: "Latest transactions by type" },
      { href: "/mempool", label: "Pending Transactions", desc: "Live mempool" },
      { href: "/blocks", label: "View Blocks", desc: "Latest mined blocks" },
      { href: "/accounts", label: "Top Accounts", desc: "Largest transparent balances" },
    ],
  },
  {
    label: "Shielded",
    items: [
      { href: "/ironwood", label: "Ironwood Tracker", desc: "Orchard → Ironwood migration" },
      { href: "/txs?kind=migration", label: "Migrations", desc: "Orchard → Ironwood transactions" },
      { href: "/txs?kind=shielded", label: "Shielded Transactions", desc: "Fully private transfers" },
      { href: "/charts#pools", label: "Pool Balances", desc: "Value in each pool over time" },
      { href: "/privacy-stats", label: "Anonymity Sets", desc: "How many notes you hide among" },
    ],
  },
  {
    label: "Resources",
    items: [
      { href: "/supply", label: "Supply & Issuance", desc: "Live supply, inflation, burn, audit" },
      { href: "/funding", label: "Dev Fund Tracker", desc: "ZCG and coinholder fund flows" },
      { href: "/fees", label: "Fee Tracker", desc: "ZIP-317 fees and mempool" },
      { href: "/charts", label: "Charts & Stats", desc: "Daily activity, fees and supply" },
      { href: "/miners", label: "Top Miners", desc: "Mining pools by blocks found" },
      { href: "/network", label: "Network Stats", desc: "Hashrate, difficulty, block time" },
      { href: "/status", label: "Status & Reorgs", desc: "Indexer health, supply audit, forks" },
    ],
  },
  {
    label: "Developers",
    items: [
      { href: "/developers", label: "API Overview", desc: "Free public REST + WebSocket API" },
      { href: "/api-docs", label: "API Documentation", desc: "Interactive reference", external: true },
      { href: "/openapi.json", label: "OpenAPI Spec", desc: "Machine-readable spec", external: true },
    ],
  },
];

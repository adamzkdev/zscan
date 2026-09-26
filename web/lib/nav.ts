export type NavItem = { href: string; label: string; external?: boolean };
export type NavMenu = { label: string; href?: string; items?: NavItem[] };

export const NAV: NavMenu[] = [
  { label: "Home", href: "/" },
  {
    label: "Blockchain",
    items: [
      { href: "/txs", label: "Transactions" },
      { href: "/mempool", label: "Pending Transactions" },
      { href: "/blocks", label: "View Blocks" },
      { href: "/accounts", label: "Top Accounts" },
    ],
  },
  {
    label: "Shielded",
    items: [
      { href: "/ironwood", label: "Ironwood Tracker" },
      { href: "/txs?kind=migration", label: "Migrations" },
      { href: "/txs?kind=shielded", label: "Shielded Transactions" },
      { href: "/charts#pools", label: "Pool Balances" },
      { href: "/privacy-stats", label: "Anonymity Sets" },
    ],
  },
  {
    label: "Resources",
    items: [
      { href: "/supply", label: "Supply & Issuance" },
      { href: "/funding", label: "Dev Fund Tracker" },
      { href: "/fees", label: "Fee Tracker" },
      { href: "/charts", label: "Charts & Stats" },
      { href: "/miners", label: "Top Miners" },
      { href: "/network", label: "Network Stats" },
      { href: "/status", label: "Status & Reorgs" },
    ],
  },
  {
    label: "Developers",
    items: [
      { href: "/developers", label: "API Overview" },
      { href: "/api-docs", label: "API Documentation", external: true },
      { href: "/openapi.json", label: "OpenAPI Spec", external: true },
    ],
  },
];

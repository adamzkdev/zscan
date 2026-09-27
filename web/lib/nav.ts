export type NavItem = { href: string; label: string; external?: boolean };
export type NavMenu = { label: string; href?: string; items?: NavItem[] };

/// ZScan AI lives in its own app (github.com/adamzkdev/zscan-ai). Inlined at build time; set
/// NEXT_PUBLIC_AI_URL to an empty value to hide the link.
export const AI_URL = process.env.NEXT_PUBLIC_AI_URL ?? "https://ai.zscan.cash";

export const NAV: NavMenu[] = [
  { label: "Home", href: "/" },
  {
    label: "Blockchain",
    items: [
      { href: "/txs", label: "Transactions" },
      { href: "/mempool", label: "Pending Transactions" },
      { href: "/blocks", label: "View Blocks" },
      { href: "/accounts", label: "Top Accounts" },
      { href: "/labels", label: "Address Labels" },
    ],
  },
  {
    label: "Shielded",
    items: [
      { href: "/ironwood", label: "Ironwood Tracker" },
      { href: "/viewing-key", label: "Viewing Key Explorer" },
      { href: "/txs?kind=migration", label: "Migrations" },
      { href: "/txs?kind=shielded", label: "Shielded Transactions" },
      { href: "/charts#pools", label: "Pool Balances" },
      { href: "/privacy-stats", label: "Anonymity Sets" },
    ],
  },
  {
    label: "Analytics",
    items: [
      { href: "/protocols", label: "Protocols" },
      { href: "/bridges", label: "Cross-chain Flows" },
      { href: "/supply", label: "Supply & Issuance" },
      { href: "/treasury", label: "Treasury" },
      { href: "/fees", label: "Fee Tracker" },
      { href: "/charts", label: "Charts & Stats" },
      { href: "/miners", label: "Top Miners" },
      { href: "/network", label: "Network Stats" },
      { href: "/upgrades", label: "Network Upgrades" },
    ],
  },
  {
    label: "Resources",
    items: [
      { href: "/developers", label: "API Documentation" },
      { href: "/zips", label: "Improvement Proposals (ZIPs)" },
      { href: "/brand", label: "Media Kit" },
      { href: "/status", label: "Status" },
      { href: "/privacy", label: "Privacy Policy" },
    ],
  },
  ...(AI_URL ? [{ label: "Ask AI", href: AI_URL }] : []),
];

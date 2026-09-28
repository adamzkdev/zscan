export type NavItem = { href: string; label: string; external?: boolean };
export type NavMenu = { label: string; href?: string; items?: NavItem[] };

/// ZScan AI lives in its own app (github.com/adamzkdev/zscan-ai). Inlined at build time; set
/// NEXT_PUBLIC_AI_URL to an empty value to hide the link.
export const AI_URL = process.env.NEXT_PUBLIC_AI_URL ?? "https://ai.zscan.cash";

/// Dashboards (markets, ZEC on other chains, daily network series) live on ZScan Stats; the
/// explorer keeps entities, lists and tools. Inlined at build time.
export const STATS_URL = (process.env.NEXT_PUBLIC_STATS_URL ?? "https://stats.zscan.cash").replace(/\/$/, "");

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
    label: "Tokens",
    items: [{ href: "/collections", label: "Collections" }],
  },
  {
    label: "Shielded",
    items: [
      { href: "/ironwood", label: "Ironwood Tracker" },
      { href: "/viewing-key", label: "Viewing Key Explorer" },
      { href: "/txs?kind=migration", label: "Migrations" },
      { href: "/txs?kind=shielded", label: "Shielded Transactions" },
      { href: `${STATS_URL}/shielded-supply`, label: "Pool Balances", external: true },
      { href: "/privacy-stats", label: "Anonymity Sets" },
    ],
  },
  {
    label: "Analytics",
    items: [
      { href: "/protocols", label: "Protocols" },
      { href: `${STATS_URL}/markets`, label: "Markets & Derivatives", external: true },
      { href: `${STATS_URL}/ecosystem`, label: "ZEC on Other Chains", external: true },
      { href: `${STATS_URL}/ecosystem#bridges`, label: "Cross-chain Flows", external: true },
      { href: "/supply", label: "Supply & Issuance" },
      { href: "/treasury", label: "Treasury" },
      { href: "/fees", label: "Fee Tracker" },
      { href: "/miners", label: "Top Miners" },
      { href: `${STATS_URL}/network`, label: "Network Stats", external: true },
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

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
    label: "Resources",
    items: [
      { href: STATS_URL, label: "Stats", external: true },
      { href: "/developers", label: "API Documentation" },
      { href: "/zips", label: "Improvement Proposals (ZIPs)" },
      { href: "/brand", label: "Media Kit" },
      { href: "/status", label: "Status" },
      { href: "/privacy", label: "Privacy Policy" },
    ],
  },
  ...(AI_URL ? [{ label: "Ask AI", href: AI_URL }] : []),
];

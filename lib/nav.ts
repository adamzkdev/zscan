import { TOOLS } from "./tools/list";

export type NavItem = { href: string; label: string; external?: boolean };
export type NavGroup = { title: string; items: NavItem[] };
/// A plain link (`href`), a dropdown (`items`) or a wide menu of titled columns (`groups`).
export type NavMenu = { label: string; href?: string; items?: NavItem[]; groups?: NavGroup[] };

/// ZScan AI lives in its own app (github.com/adamzkdev/zscan-ai). Inlined at build time; set
/// NEXT_PUBLIC_AI_URL to an empty value to hide the link.
export const AI_URL = process.env.NEXT_PUBLIC_AI_URL ?? "https://ai.zscan.cash";

/// Dashboards (markets, ZEC on other chains, daily network series) live on ZScan Stats; the
/// explorer keeps entities, lists and tools. Inlined at build time.
export const STATS_URL = (process.env.NEXT_PUBLIC_STATS_URL ?? "https://stats.zscan.cash").replace(/\/$/, "");

/// The account console (API keys, watchlist, alerts). Inlined at build time.
export const CONSOLE_URL = (process.env.NEXT_PUBLIC_CONSOLE_URL ?? "https://console.zscan.cash").replace(/\/$/, "");

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
    label: "More",
    groups: [
      {
        title: "Developers",
        items: [
          { href: "/developers", label: "API Documentation" },
          { href: `${CONSOLE_URL}/keys`, label: "API Keys", external: true },
        ],
      },
      {
        title: "Tools",
        items: [
          ...TOOLS.map((t) => ({ href: `/tools/${t.slug}`, label: t.title })),
          { href: "/viewing-key", label: "Viewing Key Scanner" },
        ],
      },
      {
        title: "Explore",
        items: [
          { href: "/fees", label: "Fee Tracker" },
          { href: "/upgrades", label: "Network Upgrades" },
          { href: "/ironwood", label: "Ironwood Migration" },
          { href: "/supply", label: "Supply Audit" },
          { href: "/miners", label: "Mining Pools" },
        ],
      },
      {
        title: "Resources",
        items: [
          { href: STATS_URL, label: "Stats", external: true },
          { href: "/zips", label: "Improvement Proposals (ZIPs)" },
          { href: "/brand", label: "Media Kit" },
          { href: "/status", label: "Status" },
          { href: "/privacy", label: "Privacy Policy" },
        ],
      },
    ],
  },
  ...(AI_URL ? [{ label: "Ask AI", href: AI_URL }] : []),
];

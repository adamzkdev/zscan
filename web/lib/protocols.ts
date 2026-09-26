export const CATEGORIES: { key: string; label: string; singular: string }[] = [
  { key: "shielded_pool", label: "Shielded Pools", singular: "Shielded Pool" },
  { key: "treasury", label: "Treasuries", singular: "Treasury" },
  { key: "bridge", label: "Bridges", singular: "Bridge" },
  { key: "exchange", label: "Exchanges", singular: "Exchange" },
  { key: "fund", label: "Funds & ETFs", singular: "Fund / ETF" },
  { key: "mining_pool", label: "Mining Pools", singular: "Mining Pool" },
];

export const categoryLabel = (key: string) => CATEGORIES.find((c) => c.key === key)?.singular ?? key;

export const ORIGINS: Record<string, string> = {
  curated: "Curated (public source)",
  consensus: "Consensus rules",
  coinbase: "Coinbase signature",
  api: "Protocol API",
};

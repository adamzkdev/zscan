import type { TxKind } from "./types";

export const KIND_LABEL: Record<TxKind, string> = {
  coinbase: "Coinbase",
  transparent: "Transparent",
  shielding: "Shielding",
  deshielding: "Deshielding",
  shielded: "Shielded",
  migration: "Migration",
  mixed: "Mixed",
};

export const KIND_HELP: Record<TxKind, string> = {
  coinbase: "Block reward paid to the miner",
  transparent: "Public transfer between transparent addresses",
  shielding: "Moves public ZEC into a shielded pool",
  deshielding: "Moves shielded ZEC out to transparent addresses",
  shielded: "Fully private: sender, receiver and amount are hidden",
  migration: "Moves ZEC from the Orchard pool into Ironwood",
  mixed: "Combination of transparent and shielded flows",
};

// Stack order is fixed and palette-validated for adjacent colorblind separation.
export const POOLS = [
  { key: "ironwood", label: "Ironwood", color: "var(--pool-ironwood)" },
  { key: "orchard", label: "Orchard", color: "var(--pool-orchard)" },
  { key: "sapling", label: "Sapling", color: "var(--pool-sapling)" },
  { key: "transparent", label: "Transparent", color: "var(--pool-transparent)" },
  { key: "sprout", label: "Sprout", color: "var(--pool-sprout)" },
] as const;

export type PoolKey = (typeof POOLS)[number]["key"];

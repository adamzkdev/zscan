import type { TxDetail } from "./types";

/** Confirmations at which received funds are treated as final (ZIP 315, untrusted inputs). */
export const FINAL_CONFIRMATIONS = 10;
/** Confirmations after which wallets spend their own change (ZIP 315, trusted inputs). */
export const TRUSTED_CONFIRMATIONS = 3;

/**
 * Proof-of-work blocks arrive as a Poisson process, so the wait for the next one is exponential
 * with mean `blockTime`, whatever time has already elapsed. Returns P(next block within `secs`).
 */
export function blockWithin(secs: number, blockTime: number) {
  return 1 - Math.exp(-Math.max(secs, 0) / blockTime);
}

/** Seconds within which the next block arrives with probability `p`. */
export function blockQuantile(p: number, blockTime: number) {
  return -Math.log(1 - p) * blockTime;
}

/** ZIP-317 logical actions of a decoded transaction. */
export function logicalActions(t: TxDetail) {
  const transparent = Math.max(t.inputs.filter((i) => i.coinbase == null).length, t.outputs.length);
  return (
    transparent +
    2 * t.joinsplits +
    Math.max(t.sapling_spends.length, t.sapling_outputs.length) +
    t.orchard_actions.length +
    t.ironwood_actions.length
  );
}

/** ZIP-317 conventional fee: miners fill blocks with txs paying at least this first. */
export function conventionalFee(actions: number, marginal = 5000, grace = 2) {
  return marginal * Math.max(grace, actions);
}

/** Pays the conventional fee, so it is expected in the next block unless blocks are full. */
export function paysConventional(fee: number | null, actions: number, marginal?: number, grace?: number) {
  return fee != null && fee >= conventionalFee(actions, marginal, grace);
}

/** "42s", "3m 05s", "1h 12m". */
export function duration(secs: number) {
  const s = Math.max(0, Math.round(secs));
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, "0")}s`;
  return `${Math.floor(s / 3600)}h ${String(Math.floor((s % 3600) / 60)).padStart(2, "0")}m`;
}

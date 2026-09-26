import "server-only";

import type { ChainContext } from "@/components/TxTracker";
import { api } from "./api";
import type { Fees, Health, Network } from "./types";

/** Tip, last block time, block time and fee policy, for pending / confirmation estimates. */
export async function chainContext(): Promise<ChainContext> {
  const [health, net, fees] = await Promise.all([
    api<Health>("/v1/health"),
    api<Network>("/v1/network"),
    api<Fees>("/v1/fees"),
  ]);
  return {
    tip: health.indexed_tip ?? health.node_tip ?? 0,
    lastBlockAt: health.last_block_time,
    blockTime: net.avg_block_time ?? 75,
    marginalFee: fees.marginal_fee,
    graceActions: fees.grace_actions,
    fitsNextBlock: fees.fits_next_block,
  };
}

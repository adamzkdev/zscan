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
    // The recent average reacts to luck and hashrate; right after an upgrade that changes the
    // target (NU7), the target is the better guide.
    blockTime: net.avg_block_time && Math.abs(net.avg_block_time / net.target_block_time - 1) < 0.5 ? net.avg_block_time : net.target_block_time,
    marginalFee: fees.marginal_fee,
    graceActions: fees.grace_actions,
    fitsNextBlock: fees.fits_next_block,
  };
}

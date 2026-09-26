import type { Metadata } from "next";
import { DailyTxChart } from "@/components/charts/DailyTxChart";
import { Card, PageTitle, Stat } from "@/components/ui";
import { api } from "@/lib/api";
import { hashrate, int, pct, zec } from "@/lib/format";
import type { DailyStats, Network, Status } from "@/lib/types";

export const metadata: Metadata = { title: "Network" };

export default async function NetworkPage() {
  const [net, daily, status] = await Promise.all([
    api<Network>("/v1/network"),
    api<DailyStats[]>("/v1/stats/daily?days=90"),
    api<Status>("/v1/status"),
  ]);
  return (
    <div className="space-y-6">
      <PageTitle eyebrow={process.env.ZSCAN_NETWORK === "testnet" ? "Testnet" : "Mainnet"} title="Network" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Height" value={int(status.chain_tip)} />
        <Stat label="Hashrate" value={hashrate(net.solps)} sub="estimated from difficulty" />
        <Stat label="Difficulty" value={net.difficulty ? `${(net.difficulty / 1e6).toFixed(1)}M` : "—"} />
        <Stat label="Avg block time" value={net.avg_block_time ? `${net.avg_block_time.toFixed(1)}s` : "—"} sub="last 100 blocks · target 75s" />
        <Stat label="Transactions 24h" value={int(net.txs_24h)} />
        <Stat label="Shielded share 24h" value={pct(net.shielded_tx_ratio_24h)} sub="txs touching a shielded pool" accent="var(--ironwood-ink)" />
        <Stat label="Fees 24h" value={`${zec(net.fees_24h, 4)} ZEC`} />
        <Stat label="Migrations 24h" value={int(net.migrations_24h)} sub="Orchard → Ironwood" />
      </div>
      <Card title="Daily transactions by type">
        <DailyTxChart data={daily} />
      </Card>
    </div>
  );
}

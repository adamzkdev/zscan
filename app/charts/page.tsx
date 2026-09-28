import type { Metadata } from "next";
import { DailyTxChart } from "@/components/charts/DailyTxChart";
import { MetricChart } from "@/components/charts/MetricChart";
import { PoolHistoryChart } from "@/components/charts/PoolHistoryChart";
import { Card, PageTitle } from "@/components/ui";
import { api, apiOrNull } from "@/lib/api";
import type { DailyStats, PoolPoint } from "@/lib/types";

export const metadata: Metadata = { title: "Zcash Charts & Statistics" };

export default async function ChartsPage() {
  const [daily, pools] = await Promise.all([
    api<DailyStats[]>("/v1/stats/daily?days=90"),
    apiOrNull<PoolPoint[]>("/v1/pools/history?interval=day"),
  ]);
  // The current day is partial; leave it out of per-day metrics.
  const full = daily.slice(0, -1).length ? daily.slice(0, -1) : daily;
  const series = (f: (d: DailyStats) => number) => full.map((d) => ({ day: d.day, value: f(d) }));
  const shieldedShare = (d: DailyStats) => (d.txs ? (d.shielded + d.shielding + d.deshielding + d.migration + d.mixed) / d.txs : 0);

  return (
    <div className="space-y-4">
      <PageTitle title="Charts & Statistics">
        Daily network activity computed from every indexed block. Updated live.
      </PageTitle>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="Daily Transactions">
          <MetricChart data={series((d) => d.txs)} unit="int" />
        </Card>
        <Card title="Shielded Transaction Share">
          <MetricChart data={series(shieldedShare)} unit="pct" color="var(--pool-ironwood)" />
        </Card>
        <Card title="Daily Fees (ZEC)">
          <MetricChart data={series((d) => d.fees / 1e8)} unit="zec" color="var(--pool-orchard)" />
        </Card>
        <Card title="Average Block Size (KB)">
          <MetricChart data={series((d) => d.avg_block_size / 1024)} unit="kb" color="var(--pool-sprout)" />
        </Card>
      </div>
      <Card title="Transactions by Type">
        <DailyTxChart data={daily} />
      </Card>
      <section id="pools" className="scroll-mt-32">
        <Card title="Value Pool Balances">
          <PoolHistoryChart initial={pools ?? []} />
        </Card>
      </section>
    </div>
  );
}

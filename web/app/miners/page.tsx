import type { Metadata } from "next";
import Link from "next/link";
import { MinerShareChart } from "@/components/charts/MinerShareChart";
import { TimeAgo } from "@/components/TimeAgo";
import { Card, PageTitle, tableHead, td, th, Zec } from "@/components/ui";
import { api } from "@/lib/api";
import { int, pct, short } from "@/lib/format";
import type { Miners } from "@/lib/types";

export const metadata: Metadata = { title: "Top Zcash Miners" };

const PERIODS = [
  ["24h", "24 Hours"],
  ["7d", "7 Days"],
  ["30d", "30 Days"],
] as const;

export default async function MinersPage(props: PageProps<"/miners">) {
  const sp = await props.searchParams;
  const period = PERIODS.some(([p]) => p === sp.period) ? (sp.period as string) : "24h";
  const m = await api<Miners>(`/v1/miners?period=${period}`);
  const name = (x: Miners["miners"][number]) => x.pool ?? short(x.address, 8, 6);

  return (
    <div className="space-y-4">
      <PageTitle title="Top Miners" eyebrow={`${int(m.total_blocks)} blocks in the last ${PERIODS.find(([p]) => p === period)![1].toLowerCase()}`}>
        Mining pools are identified from the signature they write in each block&apos;s coinbase transaction.
      </PageTitle>
      <div className="flex gap-1.5">
        {PERIODS.map(([p, l]) => (
          <Link
            key={p}
            href={`/miners?period=${p}`}
            className={`rounded-md border px-3 py-1 text-sm ${p === period ? "border-link bg-link text-white" : "border-border bg-surface text-text hover:text-link"}`}
          >
            {l}
          </Link>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">Nakamoto coefficient</p>
          <p className={`num mt-1 text-2xl font-semibold ${m.nakamoto_coefficient <= 2 ? "text-bad" : m.nakamoto_coefficient <= 3 ? "text-warn" : "text-good"}`}>
            {m.nakamoto_coefficient}
          </p>
          <p className="mt-1 text-xs text-muted">pools needed to control more than 50% of blocks</p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">Largest miner share</p>
          <p className={`num mt-1 text-2xl font-semibold ${m.top_share >= 0.5 ? "text-bad" : m.top_share >= 0.33 ? "text-warn" : ""}`}>{pct(m.top_share)}</p>
          <p className="mt-1 text-xs text-muted">{m.top_share >= 0.33 ? "Above 33%: enough to censor or selfishly mine" : "Below the 33% selfish-mining threshold"}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">Identified pools</p>
          <p className="num mt-1 text-2xl font-semibold">{pct(m.miners.filter((x) => x.pool).reduce((a, x) => a + x.blocks, 0) / m.total_blocks)}</p>
          <p className="mt-1 text-xs text-muted">of blocks carry a recognizable pool signature</p>
        </div>
      </div>
      <Card title="Share of Blocks">
        <MinerShareChart items={m.miners.map((x) => ({ label: name(x), blocks: x.blocks }))} total={m.total_blocks} />
      </Card>
      <Card pad={false}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px]">
            <thead className={tableHead}>
              <tr>
                <th className={th}>Rank</th>
                <th className={th}>Miner</th>
                <th className={th}>Payout Address</th>
                <th className={`${th} text-right`}>Blocks</th>
                <th className={`${th} text-right`}>Share</th>
                <th className={`${th} text-right`}>Rewards</th>
                <th className={`${th} text-right`}>Fees</th>
                <th className={th}>Last Block</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {m.miners.map((x, i) => (
                <tr key={x.address} className="hover:bg-surface-2">
                  <td className={`${td} text-muted`}>{i + 1}</td>
                  <td className={td}>
                    <span className="font-medium">{x.pool ?? <span className="text-muted">Unknown pool</span>}</span>
                    {x.tag && !x.pool && <p className="max-w-64 truncate text-xs text-faint" title={x.tag}>“{x.tag}”</p>}
                  </td>
                  <td className={td}>
                    <Link href={`/address/${x.address}`} className="font-mono text-link hover:text-link-hover">
                      {short(x.address, 10, 8)}
                    </Link>
                  </td>
                  <td className={`${td} num text-right`}>{int(x.blocks)}</td>
                  <td className={`${td} text-right`}>
                    <span className="inline-flex items-center gap-2">
                      <span className="hidden h-1.5 w-16 overflow-hidden rounded-full bg-surface-2 sm:block">
                        <span className="block h-full bg-link" style={{ width: `${(x.blocks / m.total_blocks) * 100}%` }} />
                      </span>
                      <span className="num">{pct(x.blocks / m.total_blocks)}</span>
                    </span>
                  </td>
                  <td className={`${td} text-right`}><Zec zat={x.rewards} decimals={2} /></td>
                  <td className={`${td} text-right`}><Zec zat={x.fees} decimals={4} /></td>
                  <td className={td}>
                    <Link href={`/block/${x.last_block}`} className="num text-link hover:text-link-hover">{x.last_block}</Link>
                    <p className="text-xs text-muted"><TimeAgo iso={x.last_time} /></p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

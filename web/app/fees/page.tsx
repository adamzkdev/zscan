import type { Metadata } from "next";
import { Card, PageTitle, Pill, tableHead, td, th, Zec } from "@/components/ui";
import { api } from "@/lib/api";
import { bytes, int, pct, usd } from "@/lib/format";
import type { Fees, Price } from "@/lib/types";

export const metadata: Metadata = { title: "Zcash Fee Tracker (ZIP-317)" };

export default async function FeesPage() {
  const [f, price] = await Promise.all([api<Fees>("/v1/fees"), api<Price>("/v1/price").catch(() => null)]);
  const inUsd = (zat: number) => (price ? usd((zat / 1e8) * price.usd) : "—");
  const tiles = [
    { label: "Standard transfer", zat: f.standard_fee, sub: "2 logical actions" },
    { label: "Median fee paid", zat: f.median_fee ?? 0, sub: "last 100 blocks" },
    { label: "Median per action", zat: Math.round(f.median_fee_per_action ?? 0), sub: `ZIP-317 rate: ${int(f.marginal_fee)} zat` },
  ];
  return (
    <div className="space-y-4">
      <PageTitle title="Fee Tracker">
        Zcash fees follow ZIP-317: {int(f.marginal_fee)} zatoshis per logical action, with a minimum of {f.grace_actions} actions.
        Fees don&apos;t spike with demand like gas; blocks are rarely full.
      </PageTitle>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {tiles.map((t) => (
          <div key={t.label} className="card p-5 text-center">
            <p className="text-sm text-muted">{t.label}</p>
            <p className="mt-2 text-2xl font-semibold"><Zec zat={t.zat} iconSize={18} /></p>
            <p className="mt-1 text-sm text-muted">{inUsd(t.zat)}</p>
            <p className="mt-2 text-xs text-faint">{t.sub}</p>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="Conventional fees by transaction shape" pad={false}>
          <table className="w-full">
            <thead className={tableHead}>
              <tr>
                <th className={th}>Transaction</th>
                <th className={`${th} text-right`}>Actions</th>
                <th className={`${th} text-right`}>Fee</th>
                <th className={`${th} text-right`}>USD</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {f.examples.map((e) => (
                <tr key={e.label}>
                  <td className={`${td} whitespace-normal`}>{e.label}</td>
                  <td className={`${td} num text-right`}>{e.logical_actions}</td>
                  <td className={`${td} text-right`}><Zec zat={e.fee} /></td>
                  <td className={`${td} text-right text-muted`}>{inUsd(e.fee)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
        <Card title="Network conditions">
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between"><dt className="text-muted">Pending transactions</dt><dd className="num">{int(f.mempool_count)}</dd></div>
            <div className="flex justify-between"><dt className="text-muted">Pending size</dt><dd className="num">{bytes(f.mempool_bytes)}</dd></div>
            <div className="flex justify-between"><dt className="text-muted">Pending fees</dt><dd><Zec zat={f.mempool_fees} /></dd></div>
            <div className="flex justify-between"><dt className="text-muted">Average block fullness (100 blocks)</dt><dd className="num">{pct(f.avg_block_fullness, 2)}</dd></div>
            <div className="flex justify-between"><dt className="text-muted">Txs paying the conventional fee</dt><dd className="num">{pct(f.conventional_share)}</dd></div>
            <div className="flex items-center justify-between">
              <dt className="text-muted">Next block</dt>
              <dd>{f.fits_next_block ? <Pill tone="good">All pending txs fit</Pill> : <Pill tone="warn">Congested</Pill>}</dd>
            </div>
          </dl>
        </Card>
      </div>
    </div>
  );
}

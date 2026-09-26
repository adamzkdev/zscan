import type { Metadata } from "next";
import { StackedDaily } from "@/components/charts/StackedDaily";
import { Hash } from "@/components/Hash";
import { Card, PageTitle, Stat, Zec } from "@/components/ui";
import { apiOrNull } from "@/lib/api";
import { IndexingStarting } from "@/app/loading-state";
import { int } from "@/lib/format";
import type { Funding } from "@/lib/types";

export const metadata: Metadata = {
  title: "Zcash Dev Fund Tracker",
  description: "On-chain flows to Zcash Community Grants and the coinholder-controlled fund, decoded from every coinbase.",
};

export default async function FundingPage() {
  const f = await apiOrNull<Funding>("/v1/funding");
  if (!f) return <IndexingStarting />;
  return (
    <div className="space-y-4">
      <PageTitle title="Dev Fund Tracker">
        Since NU6.1 (ZIP 1016), 8% of every block reward goes to Zcash Community Grants and 12% is deferred to a
        coinholder-controlled fund. These flows are decoded from each block&apos;s coinbase transaction.
      </PageTitle>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="ZCG per block" value={<Zec zat={f.per_block_funding} />} sub="paid to the funding-stream address" />
        <Stat label="Coinholder fund per block" value={<Zec zat={f.per_block_deferred} />} sub="deferred into the lockbox" />
        <Stat label="Lockbox balance" value={<Zec zat={f.lockbox_balance} decimals={2} />} sub={`at block ${int(f.height)}`} />
        <Stat
          label="Paid since indexing"
          value={<Zec zat={f.total_funding + f.total_deferred} decimals={2} />}
          sub={`from block ${int(f.indexed_from)}`}
        />
      </div>
      <Card title="Daily dev fund flows">
        <StackedDaily
          data={f.daily.map((d) => ({ day: d.day, deferred: d.deferred, funding: d.funding }))}
          series={[
            { key: "deferred", label: "Coinholder fund (lockbox)", color: "var(--pool-ironwood)" },
            { key: "funding", label: "Zcash Community Grants", color: "var(--pool-orchard)" },
          ]}
        />
      </Card>
      <Card title="Current funding-stream recipients" pad={false}>
        <ul className="divide-y divide-border">
          {f.recipients.map((a) => (
            <li key={a} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
              <span className="text-muted">Zcash Community Grants</span>
              <Hash value={a} href={`/address/${a}`} full />
            </li>
          ))}
          <li className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
            <span className="text-muted">Coinholder fund</span>
            <span className="text-muted">Deferred in-protocol (lockbox), no address until disbursed</span>
          </li>
        </ul>
      </Card>
    </div>
  );
}

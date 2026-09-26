import type { Metadata } from "next";
import Link from "next/link";
import { AuditBadge } from "@/components/AuditBadge";
import { StackedDaily } from "@/components/charts/StackedDaily";
import { Countdown, LiveSupply } from "@/components/LiveSupply";
import { TimeAgo } from "@/components/TimeAgo";
import { Card, PageTitle, Pill, Stat, tableHead, td, th, Zec } from "@/components/ui";
import { ZecIcon } from "@/components/ZecIcon";
import { apiOrNull } from "@/lib/api";
import { IndexingStarting } from "@/app/loading-state";
import { int, pct } from "@/lib/format";
import type { Audit, Supply } from "@/lib/types";

export const metadata: Metadata = {
  title: "ZEC Supply, Issuance & Supply Audit",
  description: "Live Zcash supply, inflation, issuance split, fee burn and an independent block-by-block supply audit.",
};

export default async function SupplyPage() {
  const [s, audit] = await Promise.all([apiOrNull<Supply>("/v1/supply"), apiOrNull<Audit>("/v1/supply/audit?limit=25")]);
  if (!s || !audit) return <IndexingStarting />;
  const perSecond = s.avg_block_time ? s.block_subsidy / s.avg_block_time : 0;
  const snapshotAt = new Date().toISOString();
  const split = [
    { label: "Miners", value: s.block_to_miner, color: "var(--pool-sapling)" },
    { label: "Zcash Community Grants", value: s.block_to_funding, color: "var(--pool-orchard)" },
    { label: "Coinholder fund (lockbox)", value: s.block_to_lockbox, color: "var(--pool-ironwood)" },
  ];

  return (
    <div className="space-y-4">
      <PageTitle title="ZEC Supply & Issuance">
        Computed from Zcash consensus rules for every block, and reconciled against the node.
      </PageTitle>

      {s.economics_pending && (
        <p className="card border-warn/40 bg-warn/10 px-4 py-3 text-sm text-warn">
          The chain is past a network upgrade whose new issuance rules ZScan is still adding. Per-block
          issuance and recent inflation are incomplete until then; balances and the supply itself are
          read from the node and stay exact.
        </p>
      )}
      <section className="card grid gap-6 p-6 lg:grid-cols-[1.3fr_1fr]">
        <div>
          <p className="flex items-center gap-2 text-sm text-muted">
            <ZecIcon size={18} /> Current supply <span className="text-xs text-faint">(live estimate between blocks)</span>
          </p>
          <p className="mt-1 text-4xl font-semibold tracking-tight md:text-5xl">
            <LiveSupply supply={s.supply} snapshotAt={snapshotAt} zatPerSecond={perSecond} />
            <span className="ml-2 text-2xl font-normal text-muted">ZEC</span>
          </p>
          <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-surface-2">
            <div className="h-full rounded-full bg-accent" style={{ width: `${(s.supply / s.max_supply) * 100}%` }} />
          </div>
          <p className="num mt-1.5 text-xs text-muted">
            {pct(s.supply / s.max_supply, 2)} of the 21,000,000 ZEC cap · {int(Math.round((s.max_supply - s.supply) / 1e8))} ZEC left to mine
          </p>
          <div className="mt-4">
            <AuditBadge audit={s.audit} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Stat label="Annual inflation" value={pct(s.inflation_rate, 2)} sub="issuance over last 24h × 365" />
          <Stat label="Issued (24h)" value={<Zec zat={s.issued_24h} decimals={2} />} sub={`${int(Math.round(86400 / s.target_block_time))} blocks/day`} />
          <Stat label="Burned (fee removal)" value={<Zec zat={s.burned_total} decimals={4} />} sub={<Link href="/upgrades" className="hover:text-link">NU7 fee removal · see upgrades</Link>} />
          <Stat
            label="Next halving"
            value={s.next_halving_eta ? <Countdown target={s.next_halving_eta} /> : "—"}
            sub={s.next_halving_height ? `block ${int(s.next_halving_height)} (projected at target block time)` : undefined}
          />
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1.4fr]">
        <Card title="Where each block's new ZEC goes">
          <p className="mb-3 text-sm text-muted">
            Block subsidy: <Zec zat={s.block_subsidy} /> (ZIP 1015 / 1016)
          </p>
          <div className="flex h-4 gap-[2px] overflow-hidden rounded-full">
            {split.map((x) => (
              <div key={x.label} style={{ width: `${(x.value / s.block_subsidy) * 100}%`, background: x.color }} title={x.label} />
            ))}
          </div>
          <ul className="mt-4 space-y-2 text-sm">
            {split.map((x) => (
              <li key={x.label} className="flex items-center gap-2">
                <span className="size-2.5 rounded-sm" style={{ background: x.color }} />
                {x.label}
                <span className="num ml-auto text-muted">{pct(x.value / s.block_subsidy, 0)}</span>
                <span className="w-28 text-right"><Zec zat={x.value} /></span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-muted">
            Lockbox balance: <Zec zat={s.lockbox} decimals={2} /> · <Link href="/funding" className="text-link hover:text-link-hover">Dev fund tracker →</Link>
          </p>
        </Card>
        <Card title="Daily issuance">
          <StackedDaily
            data={s.daily.map((d) => ({ day: d.day, lockbox: d.to_lockbox, funding: d.to_funding, miners: d.to_miners }))}
            series={[
              { key: "lockbox", label: "Coinholder fund", color: "var(--pool-ironwood)" },
              { key: "funding", label: "ZCG", color: "var(--pool-orchard)" },
              { key: "miners", label: "Miners", color: "var(--pool-sapling)" },
            ]}
          />
        </Card>
      </div>

      <section id="audit" className="scroll-mt-32">
        <Card
          pad={false}
          title="Independent Supply Audit"
          action={<Link href="/v1/supply/audit" prefetch={false} className="text-sm text-link hover:text-link-hover">JSON API →</Link>}
        >
          <p className="border-b border-border px-4 py-3 text-sm text-muted">{audit.method}</p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead className={tableHead}>
                <tr>
                  <th className={th}>Blocks</th>
                  <th className={th}>Checked</th>
                  {["Transparent", "Sapling", "Orchard", "Ironwood", "Lockbox", "Supply"].map((h) => (
                    <th key={h} className={`${th} text-right`}>{h} Δ</th>
                  ))}
                  <th className={th}>Result</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {audit.checks.map((c) => (
                  <tr key={c.height} className="hover:bg-surface-2">
                    <td className={td}>
                      <Link href={`/block/${c.prev_height + 1}`} className="num text-link hover:text-link-hover">{c.prev_height + 1}</Link>
                      {c.height > c.prev_height + 1 && (
                        <>
                          {" → "}
                          <Link href={`/block/${c.height}`} className="num text-link hover:text-link-hover">{c.height}</Link>
                        </>
                      )}
                    </td>
                    <td className={`${td} text-muted`}><TimeAgo iso={c.checked_at} /></td>
                    {[c.diff_transparent, c.diff_sapling, c.diff_orchard, c.diff_ironwood, c.diff_lockbox, c.diff_supply].map((d, i) => (
                      <td key={i} className={`${td} num text-right ${d === 0 ? "text-muted" : "font-semibold text-bad"}`}>{d} zat</td>
                    ))}
                    <td className={td}>{c.ok ? <Pill tone="good">✓ Match</Pill> : <Pill tone="bad">Mismatch</Pill>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </section>
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProtocolChart } from "@/components/charts/ProtocolChart";
import { Hash } from "@/components/Hash";
import { KindBadge } from "@/components/KindBadge";
import { TimeAgo } from "@/components/TimeAgo";
import { Card, Empty, PageTitle, Pill, Stat, tableHead, td, th, Zec } from "@/components/ui";
import { apiOrNull } from "@/lib/api";
import { int, pct, signedZec, zec } from "@/lib/format";
import { categoryLabel, ORIGINS } from "@/lib/protocols";
import type { ProtocolDetail } from "@/lib/types";

export async function generateMetadata(props: PageProps<"/protocol/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const d = await apiOrNull<ProtocolDetail>(`/v1/protocols/${encodeURIComponent(slug)}?days=1`);
  return { title: d ? `${d.protocol.name}: ZEC Holdings & Flows` : "Protocol" };
}

/** Protocol-specific figures from `stats`, as label/value rows. */
function statRows(stats: Record<string, unknown> | null): [string, string][] {
  if (!stats) return [];
  const rows: [string, string][] = [];
  if (typeof stats.share_30d === "number") rows.push(["Share of blocks (30d)", pct(stats.share_30d, 2)]);
  if (typeof stats.blocks_30d === "number") rows.push(["Blocks mined (30d)", int(stats.blocks_30d)]);
  if (typeof stats.asset_depth === "number") rows.push(["ZEC in the pool (per Maya)", `${zec(stats.asset_depth, 2)} ZEC`]);
  if (typeof stats.halted === "boolean") rows.push(["ZEC chain status", stats.halted ? "Halted" : "Active"]);
  if (typeof stats.trading_paused === "boolean") rows.push(["ZEC trading", stats.trading_paused ? "Paused" : "Open"]);
  if (typeof stats.shielded_deposits === "boolean") rows.push(["Shielded deposits", stats.shielded_deposits ? "Supported" : "No"]);
  return rows;
}

export default async function ProtocolPage(props: PageProps<"/protocol/[slug]">) {
  const { slug } = await props.params;
  const d = await apiOrNull<ProtocolDetail>(`/v1/protocols/${encodeURIComponent(slug)}?days=180`);
  if (!d) notFound();
  const p = d.protocol;
  const rows = statRows(p.stats);
  const pool = p.category === "shielded_pool";

  return (
    <div className="space-y-4">
      <PageTitle eyebrow={categoryLabel(p.category)} title={p.name}>
        {p.description}
        {p.website && (
          <>
            {" "}
            <a href={p.website} className="text-link hover:text-link-hover" rel="noopener noreferrer" target="_blank">
              {new URL(p.website).hostname} ↗
            </a>
          </>
        )}
      </PageTitle>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Holdings" value={<Zec zat={p.holdings} decimals={2} />} sub={pool ? "consensus pool value" : `${int(p.addresses)} labeled address${p.addresses === 1 ? "" : "es"}`} />
        <Stat label="Change 7d" value={p.change_7d == null ? "—" : `${signedZec(p.change_7d, 2)} ZEC`} accent={p.change_7d == null ? undefined : p.change_7d >= 0 ? "var(--good)" : "var(--bad)"} />
        <Stat label="Inflow 7d" value={<Zec zat={p.inflow_7d} decimals={2} />} />
        <Stat label="Outflow 7d" value={p.outflow_7d == null ? "—" : <Zec zat={p.outflow_7d} decimals={2} />} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <Card title="Holdings and flows">
          <ProtocolChart daily={d.daily} />
          <p className="mt-2 text-xs text-muted">
            Reconstructed backwards from today&apos;s balance using every indexed flow since block {int(d.indexed_from)}.
          </p>
        </Card>
        <Card title="Overview" pad={false}>
          <dl className="divide-y divide-border text-sm">
            <Row label="Category" value={categoryLabel(p.category)} />
            <Row label="Change 1d" value={p.change_1d == null ? "—" : `${signedZec(p.change_1d, 2)} ZEC`} />
            <Row label="Change 30d" value={p.change_30d == null ? "—" : `${signedZec(p.change_30d, 2)} ZEC`} />
            {rows.map(([k, v]) => (
              <Row key={k} label={k} value={v} />
            ))}
            <Row label="API" value={<Link href={`/v1/protocols/${p.slug}`} prefetch={false} className="text-link hover:text-link-hover">/v1/protocols/{p.slug}</Link>} />
          </dl>
        </Card>
      </div>

      {d.addresses.length > 0 && (
        <Card title={`Addresses (${d.addresses.length})`} pad={false}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px]">
              <thead className={tableHead}>
                <tr>
                  <th className={th}>Address</th>
                  <th className={th}>Status</th>
                  <th className={th}>Source</th>
                  <th className={`${th} text-right`}>Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {d.addresses.map((a) => (
                  <tr key={a.address} className="hover:bg-surface-2">
                    <td className={td}>
                      <Hash value={a.address} href={`/address/${a.address}`} head={12} tail={8} />
                    </td>
                    <td className={td}>{a.active ? <Pill tone="good">Active</Pill> : <Pill>Retired</Pill>}</td>
                    <td className={`${td} whitespace-normal text-xs text-muted`}>
                      <span className="text-text">{ORIGINS[a.origin] ?? a.origin}</span> · {a.source}
                    </td>
                    <td className={`${td} text-right`}><Zec zat={a.balance} decimals={4} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {!pool && (
        <Card title="Latest transactions" pad={false}>
          {d.recent_txs.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px]">
                <thead className={tableHead}>
                  <tr>
                    <th className={th}>Transaction</th>
                    <th className={th}>Type</th>
                    <th className={th}>Block</th>
                    <th className={th}>Age</th>
                    <th className={`${th} text-right`}>Net for {p.name}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {d.recent_txs.map((t) => (
                    <tr key={t.txid} className="hover:bg-surface-2">
                      <td className={td}><Hash value={t.txid} href={`/tx/${t.txid}`} head={10} tail={6} /></td>
                      <td className={td}><KindBadge kind={t.kind} /></td>
                      <td className={td}><Link href={`/block/${t.height}`} className="text-link hover:text-link-hover">{t.height}</Link></td>
                      <td className={`${td} text-muted`}><TimeAgo iso={t.time} /></td>
                      <td className={`${td} num text-right ${t.delta >= 0 ? "text-good" : "text-bad"}`}>{signedZec(t.delta, 4)} ZEC</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty>No transactions in the indexed range.</Empty>
          )}
        </Card>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2.5">
      <dt className="text-muted">{label}</dt>
      <dd className="num text-right">{value}</dd>
    </div>
  );
}

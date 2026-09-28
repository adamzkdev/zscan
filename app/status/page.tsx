import type { Metadata } from "next";
import Link from "next/link";
import { AuditBadge } from "@/components/AuditBadge";
import { TimeAgo } from "@/components/TimeAgo";
import { Card, Empty, PageTitle, Pill, tableHead, td, th } from "@/components/ui";
import { api } from "@/lib/api";
import { int, short } from "@/lib/format";
import type { Health } from "@/lib/types";

export const metadata: Metadata = { title: "Status & Reorgs" };

export default async function StatusPage() {
  const h = await api<Health>("/v1/health");
  const synced = h.lag_blocks != null && h.lag_blocks <= 2;
  return (
    <div className="space-y-4">
      <PageTitle title="Status" eyebrow={h.network}>
        Live health of ZScan&apos;s indexer, data sources and supply audit.
      </PageTitle>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <Card title="Indexer">
          {synced ? <Pill tone="good">● Synced</Pill> : <Pill tone="warn">Catching up</Pill>}
          <p className="num mt-2 text-sm text-muted">Block {int(h.indexed_tip)} · {h.lag_blocks ?? "?"} behind node</p>
        </Card>
        <Card title="Node (lightwalletd)">
          {h.lightwalletd_ok ? <Pill tone="good">● Online</Pill> : <Pill tone="bad">Unreachable</Pill>}
          <p className="num mt-2 text-sm text-muted">Tip {int(h.node_tip)}</p>
        </Card>
        <Card title="Last block">
          <p className="text-sm">{h.last_block_time ? <TimeAgo iso={h.last_block_time} /> : "—"}</p>
          <p className="mt-2 text-xs text-muted">Pool snapshot {h.last_snapshot_time ? <TimeAgo iso={h.last_snapshot_time} /> : "—"}</p>
        </Card>
        <Card title="Supply audit">
          <AuditBadge audit={{ checks: h.audit_checks, failed: h.audit_failed, last_height: null, last_checked: null }} />
        </Card>
      </div>
      <Card title="Chain Reorganizations" pad={false}>
        {h.reorgs.length ? (
          <table className="w-full">
            <thead className={tableHead}>
              <tr>
                <th className={th}>Detected</th>
                <th className={th}>Height</th>
                <th className={th}>Replaced block</th>
                <th className={th}>New block</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {h.reorgs.map((r, i) => (
                <tr key={i}>
                  <td className={`${td} text-muted`}><TimeAgo iso={r.detected_at} /></td>
                  <td className={td}><Link href={`/block/${r.height}`} className="num text-link hover:text-link-hover">{r.height}</Link></td>
                  <td className={`${td} font-mono text-xs text-muted`}>{short(r.old_hash, 12, 8)}</td>
                  <td className={`${td} font-mono text-xs`}>{short(r.new_hash, 12, 8)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <Empty>No reorganizations seen since the indexer started.</Empty>
        )}
      </Card>
    </div>
  );
}

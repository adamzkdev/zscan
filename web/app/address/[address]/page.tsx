import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CopyButton } from "@/components/Hash";
import { KindBadge } from "@/components/KindBadge";
import { QrButton } from "@/components/QrButton";
import { TimeAgo } from "@/components/TimeAgo";
import { Card, Empty, PageTitle, Pill, tableHead, td, th, Zec } from "@/components/ui";
import { apiOrNull } from "@/lib/api";
import { int, short, utc } from "@/lib/format";
import type { AddressDetail } from "@/lib/types";

export async function generateMetadata(props: PageProps<"/address/[address]">): Promise<Metadata> {
  const { address } = await props.params;
  return { title: `Address ${address}` };
}

export default async function AddressPage(props: PageProps<"/address/[address]">) {
  const { address } = await props.params;
  const sp = await props.searchParams;
  const page = Math.max(0, Number(sp.page ?? 0) || 0);
  const a = await apiOrNull<AddressDetail>(`/v1/address/${encodeURIComponent(address)}?limit=25&page=${page}`);
  if (!a) notFound();

  return (
    <div className="space-y-4">
      <PageTitle
        title={
          <span className="flex flex-wrap items-center gap-2">
            Address <span className="break-all font-mono text-base font-normal">{a.address}</span>
            <CopyButton value={a.address} />
            <QrButton value={a.address} />
          </span>
        }
      />
      {(a.label || a.blocks_mined > 0) && (
        <div className="-mt-2 flex flex-wrap items-center gap-2">
          {a.label && <Pill tone="info">{a.label}</Pill>}
          {a.blocks_mined > 0 && <Pill>{int(a.blocks_mined)} blocks mined (indexed range)</Pill>}
        </div>
      )}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card title="Overview">
          <p className="text-xs font-medium uppercase text-muted">ZEC Balance</p>
          <p className="mt-1">
            <Zec zat={a.balance} />
          </p>
          <p className="mt-4 text-xs font-medium uppercase text-muted">ZEC Value</p>
          <p className="mt-1">
            <Zec zat={a.balance} showUsd decimals={2} />
          </p>
        </Card>
        <Card title="More Info">
          <p className="text-xs font-medium uppercase text-muted">First seen (indexed)</p>
          <p className="mt-1 text-sm">{a.first_seen ? <><TimeAgo iso={a.first_seen} /> <span className="text-muted">({utc(a.first_seen)})</span></> : "—"}</p>
          <p className="mt-4 text-xs font-medium uppercase text-muted">Last seen</p>
          <p className="mt-1 text-sm">{a.last_seen ? <><TimeAgo iso={a.last_seen} /> <span className="text-muted">({utc(a.last_seen)})</span></> : "—"}</p>
        </Card>
        <Card title="Activity (indexed range)">
          <p className="text-xs font-medium uppercase text-muted">Received / Sent</p>
          <p className="mt-1 flex flex-wrap gap-2 text-sm">
            <Zec zat={a.received} decimals={4} /> / <Zec zat={a.sent} decimals={4} />
          </p>
          <p className="mt-4 text-xs font-medium uppercase text-muted">Transactions</p>
          <p className="mt-1 text-sm">{int(a.tx_count)}</p>
        </Card>
      </div>

      <Card
        pad={false}
        title="Transactions"
        action={
          <a href={`/v1/address/${a.address}/csv`} className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-xs text-text hover:text-link" download>
            ⤓ Download CSV
          </a>
        }
      >
        {a.txs.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px]">
              <thead className={tableHead}>
                <tr>
                  <th className={th}>Transaction Hash</th>
                  <th className={th}>Method</th>
                  <th className={th}>Block</th>
                  <th className={th}>Age</th>
                  <th className={th} />
                  <th className={`${th} text-right`}>Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {a.txs.map((t) => (
                  <tr key={t.txid} className="hover:bg-surface-2">
                    <td className={td}>
                      <Link href={`/tx/${t.txid}`} className="font-mono text-link hover:text-link-hover">{short(t.txid, 14, 0)}</Link>
                    </td>
                    <td className={td}><KindBadge kind={t.kind} /></td>
                    <td className={td}><Link href={`/block/${t.height}`} className="num text-link hover:text-link-hover">{t.height}</Link></td>
                    <td className={`${td} text-muted`}><TimeAgo iso={t.time} /></td>
                    <td className={td}>{t.delta >= 0 ? <Pill tone="good">IN</Pill> : <Pill tone="warn">OUT</Pill>}</td>
                    <td className={`${td} text-right`}><Zec zat={Math.abs(t.delta)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty>No activity in the indexed range.</Empty>
        )}
        <div className="flex items-center justify-between border-t border-border px-4 py-3 text-sm">
          <span className="text-xs text-faint">{a.indexed_from != null && `Activity indexed from block ${int(a.indexed_from)}. Balance covers full history.`}</span>
          <div className="flex gap-2">
            {page > 0 && <Link href={`?page=${page - 1}`} className="rounded-md border border-border px-3 py-1 text-link hover:bg-surface-2">‹ Newer</Link>}
            {a.txs.length === 25 && <Link href={`?page=${page + 1}`} className="rounded-md border border-border px-3 py-1 text-link hover:bg-surface-2">Older ›</Link>}
          </div>
        </div>
      </Card>
    </div>
  );
}

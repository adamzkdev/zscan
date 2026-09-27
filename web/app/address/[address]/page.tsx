import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AddressTxTable } from "@/components/AddressTxTable";
import { CopyButton } from "@/components/Hash";
import { InscriptionGrid } from "@/components/Inscription";
import { NameTag } from "@/components/NameTag";
import { QrButton } from "@/components/QrButton";
import { TimeAgo } from "@/components/TimeAgo";
import { Card, PageTitle, Pill, tableHead, td, th, Zec } from "@/components/ui";
import { Amount } from "@/components/Zrc20";
import { apiOrNull } from "@/lib/api";
import { int, utc } from "@/lib/format";
import type { AddressDetail, AddressInscriptions, Price } from "@/lib/types";

export async function generateMetadata(props: PageProps<"/address/[address]">): Promise<Metadata> {
  const { address } = await props.params;
  return { title: `Address ${address}` };
}

export default async function AddressPage(props: PageProps<"/address/[address]">) {
  const { address } = await props.params;
  const sp = await props.searchParams;
  const q = new URLSearchParams({ limit: "25" });
  for (const k of ["page", "kind", "direction", "sort", "order"]) {
    const v = sp[k];
    if (typeof v === "string" && v) q.set(k, v);
  }
  const [a, price, history, ins] = await Promise.all([
    apiOrNull<AddressDetail>(`/v1/address/${encodeURIComponent(address)}?${q}`),
    apiOrNull<Price>("/v1/price").catch(() => null),
    apiOrNull<{ usd: [number, number][] }>("/v1/price/history").catch(() => null),
    apiOrNull<AddressInscriptions>(`/v1/address/${encodeURIComponent(address)}/inscriptions`).catch(() => null),
  ]);
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
          {a.tag ? <NameTag tag={a.tag} /> : a.label && <Pill tone="info">{a.label}</Pill>}
          {a.tag && !a.tag.active && <Pill>Retired</Pill>}
          {a.blocks_mined > 0 && <Pill>{int(a.blocks_mined)} blocks mined (indexed range)</Pill>}
          {a.tag && <span className="text-xs text-muted">Label source: {a.tag.source}</span>}
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
        <AddressTxTable a={a} rates={price?.rates ?? null} usdHistory={history?.usd ?? []} />
      </Card>

      {ins && ins.zrc20.length > 0 && (
        <Card title={`ZRC-20 Tokens (${ins.zrc20.length})`} pad={false}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px]">
              <thead className={tableHead}>
                <tr>
                  <th className={th}>Token</th>
                  <th className={`${th} text-right`}>Balance</th>
                  <th className={`${th} text-right`}>Available</th>
                  <th className={`${th} text-right`}>Committed to transfers</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {ins.zrc20.map((z) => (
                  <tr key={z.tick} className="hover:bg-surface-2">
                    <td className={td}>
                      <Link href={`/token/${z.tick}`} className="font-medium uppercase text-link hover:text-link-hover">{z.tick}</Link>
                    </td>
                    <td className={`${td} num text-right`}><Amount v={z.balance} /></td>
                    <td className={`${td} num text-right`}><Amount v={z.available} /></td>
                    <td className={`${td} num text-right text-muted`}>{z.transferable === "0" ? "—" : <Amount v={z.transferable} />}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {ins && ins.inscription_count > 0 && (
        <Card title={`Inscriptions (${int(ins.inscription_count)})`}>
          <InscriptionGrid items={ins.inscriptions} small />
          {ins.inscription_count > ins.inscriptions.length && (
            <p className="mt-3 text-xs text-muted">Showing the newest {ins.inscriptions.length}.</p>
          )}
        </Card>
      )}
    </div>
  );
}

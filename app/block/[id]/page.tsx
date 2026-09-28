import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Hash } from "@/components/Hash";
import { ClockIcon } from "@/components/icons";
import { TimeAgo } from "@/components/TimeAgo";
import { TxTable } from "@/components/tables";
import { Card, PageTitle, Pill, Rows, Zec } from "@/components/ui";
import { apiOrNull } from "@/lib/api";
import { bytes, int, utc } from "@/lib/format";
import { POOLS } from "@/lib/kinds";
import type { BlockDetail } from "@/lib/types";

export async function generateMetadata(props: PageProps<"/block/[id]">): Promise<Metadata> {
  const { id } = await props.params;
  return { title: `Zcash Block #${id}` };
}

export default async function BlockPage(props: PageProps<"/block/[id]">) {
  const { id } = await props.params;
  const b = await apiOrNull<BlockDetail>(`/v1/blocks/${encodeURIComponent(id)}`);
  if (!b) notFound();
  const moved = POOLS.filter((p) => b.pool_deltas[p.key] !== 0);
  const nav = "grid size-7 place-items-center rounded-md border border-border bg-surface text-muted hover:text-link";

  return (
    <div className="space-y-4">
      <PageTitle title="Block" eyebrow={`#${b.height}`} />
      <Card pad={false}>
        <Rows
          rows={[
            [
              "Block Height",
              <span key="h" className="flex items-center gap-2">
                <span className="font-medium">{b.height}</span>
                <Link href={`/block/${b.height - 1}`} className={nav} aria-label="Previous block">‹</Link>
                <Link href={`/block/${b.height + 1}`} className={nav} aria-label="Next block">›</Link>
              </span>,
              "Also known as block number. The block height is the length of the chain up to this block.",
            ],
            ["Status", b.confirmations != null && b.confirmations >= 10 ? <Pill key="s" tone="good">✓ Finalized</Pill> : <Pill key="s" tone="warn">Unfinalized ({b.confirmations ?? 0} confirmations)</Pill>, "Blocks are considered final after 10 confirmations."],
            ["Timestamp", <span key="t" className="flex items-center gap-1.5"><ClockIcon /> <TimeAgo iso={b.time} /> <span className="text-muted">({utc(b.time)})</span></span>, "Date and time at which the block was mined."],
            ["Transactions", <span key="tx"><span className="text-link">{b.tx_count} transactions</span> in this block</span>, "Number of transactions in the block, including the coinbase."],
          ]}
        />
        <div className="border-t border-border" />
        <Rows
          rows={[
            ["Mined by", b.miner ? <Hash key="m" value={b.miner} href={`/address/${b.miner}`} full /> : "Shielded coinbase", "Address receiving the block reward."],
            ["Block Reward", <Zec key="r" zat={b.coinbase_value} showUsd />, "Subsidy plus fees paid to the miner, after the development fund lockbox share."],
            ["Total Fees", <Zec key="f" zat={b.fees} showUsd />, "Sum of the fees of all transactions in the block."],
            ["Size", `${int(b.size)} bytes (${bytes(b.size)})`, "Serialized size of the block."],
          ]}
        />
        <div className="border-t border-border" />
        <Rows
          rows={[
            ["Hash", <Hash key="h" value={b.hash} full />, "Block header hash."],
            ["Parent Hash", <Hash key="p" value={b.prev_hash} href={`/block/${b.height - 1}`} full />, "Hash of the previous block."],
            ["Commitment Trees", <span key="t" className="text-muted">Sapling {int(b.sapling_tree_size)} · Orchard {int(b.orchard_tree_size)} · Ironwood {int(b.ironwood_tree_size)}</span>, "Number of notes in each shielded pool's commitment tree after this block."],
            moved.length
              ? [
                  "Pool Changes",
                  <span key="pc" className="flex flex-wrap gap-2">
                    {moved.map((p) => (
                      <span key={p.key} className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface-2 px-2 py-0.5 text-xs">
                        <span className="size-2 rounded-sm" style={{ background: p.color }} />
                        {p.label} {b.pool_deltas[p.key] > 0 ? "+" : "−"}
                        <Zec zat={Math.abs(b.pool_deltas[p.key])} iconSize={11} />
                      </span>
                    ))}
                  </span>,
                  "Net change of each value pool caused by this block.",
                ]
              : null,
          ]}
        />
      </Card>

      <Card title={`Transactions (${b.tx_count})`} pad={false}>
        <TxTable txs={b.txs} showBlock={false} />
      </Card>
      {!b.indexed && <p className="text-center text-xs text-faint">Decoded live from the network (outside the indexed range).</p>}
    </div>
  );
}

import Link from "next/link";
import { bytes, short } from "@/lib/format";
import type { BlockSummary, TxRow } from "@/lib/types";
import { ArrowRightIcon, ShieldIcon } from "./icons";
import { KindBadge } from "./KindBadge";
import { PoolTag } from "./PoolIcon";
import { TimeAgo } from "./TimeAgo";
import { Empty, tableHead, td, th, Zec } from "./ui";

export function BlocksTable({ blocks }: { blocks: BlockSummary[] }) {
  if (!blocks.length) return <Empty>No blocks indexed yet.</Empty>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[860px]">
        <thead className={tableHead}>
          <tr>
            <th className={th}>Block</th>
            <th className={th}>Age</th>
            <th className={th}>Txn</th>
            <th className={th}>Miner</th>
            <th className={th}>Size</th>
            <th className={th}>Fees</th>
            <th className={`${th} text-right`}>Reward</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {blocks.map((b) => (
            <tr key={b.height} className="hover:bg-surface-2">
              <td className={td}>
                <Link href={`/block/${b.height}`} className="num text-link hover:text-link-hover">
                  {b.height}
                </Link>
              </td>
              <td className={`${td} text-muted`}>
                <TimeAgo iso={b.time} />
              </td>
              <td className={td}>
                <Link href={`/block/${b.height}`} className="num text-link hover:text-link-hover">
                  {b.tx_count}
                </Link>
              </td>
              <td className={td}>
                {b.miner ? (
                  <Link href={`/address/${b.miner}`} className={`${b.miner_pool ? "" : "font-mono "}text-link hover:text-link-hover`} title={b.miner}>
                    {b.miner_pool ?? short(b.miner, 8, 6)}
                  </Link>
                ) : (
                  <span className="text-muted">shielded</span>
                )}
              </td>
              <td className={`${td} num text-muted`}>{bytes(b.size)}</td>
              <td className={td}>
                <Zec zat={b.fees} />
              </td>
              <td className={`${td} text-right`}>
                <Zec zat={b.coinbase_value} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Value to show for a tx: transparent output for public flows, pool movement for shielded ones. */
export function txValue(t: Pick<TxRow, "kind" | "transparent_out" | "orchard_vb" | "ironwood_vb" | "sapling_vb">) {
  if (t.kind === "migration") return Math.abs(t.orchard_vb);
  if (t.kind === "shielding")
    return Math.abs(Math.min(t.ironwood_vb, 0) + Math.min(t.orchard_vb, 0) + Math.min(t.sapling_vb, 0));
  if (t.kind === "shielded") return null;
  return t.transparent_out;
}

function Party({ addr, pool }: { addr: string | null; pool?: string }) {
  if (addr)
    return (
      <Link href={`/address/${addr}`} className="font-mono text-link hover:text-link-hover" title={addr}>
        {short(addr, 8, 6)}
      </Link>
    );
  return <PoolTag name={pool ?? "Shielded"} />;
}

/** Which shielded pool a side of the transaction touches, for the From / To columns. */
export function shieldedSide(t: Pick<TxRow, "ironwood_vb" | "orchard_vb" | "sapling_vb" | "n_ironwood_actions" | "n_orchard_actions" | "n_sapling_spends" | "n_sapling_outputs">, side: "from" | "to") {
  const sign = side === "from" ? 1 : -1;
  const hit = [
    ["Ironwood", t.ironwood_vb],
    ["Orchard", t.orchard_vb],
    ["Sapling", t.sapling_vb],
  ].filter(([, v]) => (v as number) * sign > 0);
  if (hit.length) return hit.map(([n]) => n).join(" + ");
  const any = [
    ["Ironwood", t.n_ironwood_actions],
    ["Orchard", t.n_orchard_actions],
    ["Sapling", t.n_sapling_spends + t.n_sapling_outputs],
  ].find(([, n]) => (n as number) > 0);
  return any ? (any[0] as string) : "Shielded";
}

export function TxTable({ txs, showBlock = true }: { txs: TxRow[]; showBlock?: boolean }) {
  if (!txs.length) return <Empty>No transactions.</Empty>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1000px]">
        <thead className={tableHead}>
          <tr>
            <th className={th}>Transaction Hash</th>
            <th className={th}>Method</th>
            {showBlock && <th className={th}>Block</th>}
            <th className={th}>Age</th>
            <th className={th}>From</th>
            <th className="w-6" />
            <th className={th}>To</th>
            <th className={th}>Amount</th>
            <th className={`${th} text-right`}>Txn Fee</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {txs.map((t) => {
            const v = txValue(t);
            return (
              <tr key={t.txid} className="hover:bg-surface-2">
                <td className={td}>
                  <Link href={`/tx/${t.txid}`} className="font-mono text-link hover:text-link-hover" title={t.txid}>
                    {short(t.txid, 14, 0)}
                  </Link>
                </td>
                <td className={td}>
                  <KindBadge kind={t.kind} />
                </td>
                {showBlock && (
                  <td className={td}>
                    <Link href={`/block/${t.height}`} className="num text-link hover:text-link-hover">
                      {t.height}
                    </Link>
                  </td>
                )}
                <td className={`${td} text-muted`}>
                  <TimeAgo iso={t.time} />
                </td>
                <td className={td}>
                  {t.kind === "coinbase" ? <span className="text-muted">Block Reward</span> : <Party addr={t.from_address} pool={shieldedSide(t, "from")} />}
                </td>
                <td className="px-1">
                  <span className="grid size-6 place-items-center rounded-full border border-good/30 bg-good-bg text-good">
                    <ArrowRightIcon size={12} />
                  </span>
                </td>
                <td className={td}>
                  <Party addr={t.to_address} pool={shieldedSide(t, "to")} />
                </td>
                <td className={td}>
                  {v == null ? (
                    <span className="inline-flex items-center gap-1 text-ironwood">
                      <ShieldIcon size={13} /> Hidden
                    </span>
                  ) : (
                    <Zec zat={v} />
                  )}
                </td>
                <td className={`${td} text-right text-muted`}>
                  {t.fee == null ? "—" : (t.fee / 1e8).toLocaleString("en-US", { maximumFractionDigits: 8 })}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

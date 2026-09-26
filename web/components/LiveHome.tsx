"use client";

import Link from "next/link";
import { short } from "@/lib/format";
import type { BlockSummary, TxRow } from "@/lib/types";
import { CubeIcon, ShieldIcon, TxIcon } from "./icons";
import { PoolTag } from "./PoolIcon";
import { shieldedSide, txValue } from "./tables";
import { TimeAgo } from "./TimeAgo";
import { Card } from "./ui";
import { ZecPill } from "./Zec";

/** Latest blocks and transactions. Kept fresh by <LiveRefresh>, which re-renders on each block. */
export function LiveHome({ blocks, txs }: { blocks: BlockSummary[]; txs: TxRow[] }) {
  const viewAll = (href: string, label: string) => (
    <Link href={href} className="text-xs font-medium uppercase tracking-wide text-muted hover:text-link">
      {label} →
    </Link>
  );

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card pad={false} title={<span className="flex items-center gap-2">Latest Blocks <LiveDot /></span>} footer={viewAll("/blocks", "View all blocks")}>
        <ul className="divide-y divide-border">
          {blocks.map((b) => (
            <li key={b.height} className="animate-[row-in_1.2s_ease-out] grid grid-cols-[auto_1fr_auto] items-center gap-3 px-4 py-3.5 sm:grid-cols-[auto_150px_1fr_auto]">
              <span className="grid size-11 place-items-center rounded-lg bg-surface-2 text-muted">
                <CubeIcon />
              </span>
              <div>
                <Link href={`/block/${b.height}`} className="num text-link hover:text-link-hover">
                  {b.height}
                </Link>
                <p className="text-xs text-muted">
                  <TimeAgo iso={b.time} />
                </p>
              </div>
              <div className="hidden min-w-0 text-sm sm:block">
                <p className="truncate">
                  Miner{" "}
                  {b.miner_pool && b.miner ? (
                    <Link href={`/address/${b.miner}`} className="text-link hover:text-link-hover">
                      {b.miner_pool}
                    </Link>
                  ) : b.miner ? (
                    <Link href={`/address/${b.miner}`} className="font-mono text-link hover:text-link-hover">
                      {short(b.miner, 8, 6)}
                    </Link>
                  ) : (
                    <span className="text-muted">shielded</span>
                  )}
                </p>
                <p className="text-xs">
                  <Link href={`/block/${b.height}`} className="text-link hover:text-link-hover">
                    {b.tx_count} txns
                  </Link>
                </p>
              </div>
              <span title="Block reward">
                <ZecPill zat={b.coinbase_value} />
              </span>
            </li>
          ))}
        </ul>
      </Card>
      <Card pad={false} title={<span className="flex items-center gap-2">Latest Transactions <LiveDot /></span>} footer={viewAll("/txs", "View all transactions")}>
        <ul className="divide-y divide-border">
          {txs.map((t) => {
            const v = txValue(t);
            const hidden = !t.from_address && !t.to_address;
            return (
              <li key={t.txid} className="animate-[row-in_1.2s_ease-out] grid grid-cols-[auto_1fr_auto] items-center gap-3 px-4 py-3.5 sm:grid-cols-[auto_150px_1fr_auto]">
                <span className="grid size-11 place-items-center rounded-full bg-surface-2 text-muted">
                  <TxIcon />
                </span>
                <div className="min-w-0">
                  <Link href={`/tx/${t.txid}`} className="block truncate font-mono text-sm text-link hover:text-link-hover">
                    {short(t.txid, 10, 0)}
                  </Link>
                  <p className="text-xs text-muted">
                    <TimeAgo iso={t.time} />
                  </p>
                </div>
                <div className="hidden min-w-0 text-sm sm:block">
                  {hidden ? (
                    <p className="flex items-center gap-1.5">
                      <PoolTag name={shieldedSide(t, "from")} />
                      <span className="text-faint">→</span>
                      <PoolTag name={shieldedSide(t, "to")} />
                    </p>
                  ) : (
                    <>
                      <AddrLine label="From" addr={t.from_address} pool={shieldedSide(t, "from")} />
                      <AddrLine label="To" addr={t.to_address} pool={shieldedSide(t, "to")} />
                    </>
                  )}
                </div>
                {v == null ? (
                  <span className="inline-flex items-center gap-1 rounded-md border border-border-strong px-2 py-0.5 text-xs text-ironwood">
                    <ShieldIcon size={12} /> Hidden
                  </span>
                ) : (
                  <ZecPill zat={v} />
                )}
              </li>
            );
          })}
        </ul>
      </Card>
    </div>
  );
}

function AddrLine({ label, addr, pool }: { label: string; addr: string | null; pool: string }) {
  return (
    <p className="truncate">
      {label}{" "}
      {addr ? (
        <Link href={`/address/${addr}`} className="font-mono text-link hover:text-link-hover">
          {short(addr, 8, 6)}
        </Link>
      ) : (
        <PoolTag name={pool} />
      )}
    </p>
  );
}

export function LiveDot() {
  return (
    <span className="relative inline-flex size-2" title="Live">
      <span className="absolute inline-flex size-full animate-ping rounded-full bg-good opacity-60" />
      <span className="relative inline-flex size-2 rounded-full bg-good" />
    </span>
  );
}

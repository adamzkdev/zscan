"use client";

import Link from "next/link";
import { useState } from "react";
import { blockQuantile, duration, paysConventional } from "@/lib/estimate";
import { bytes, int, short } from "@/lib/format";
import type { Mempool } from "@/lib/types";
import { KindBadge } from "./KindBadge";
import { LiveDot } from "./LiveHome";
import { useLive } from "./live";
import { TimeAgo } from "./TimeAgo";
import { type ChainContext, NextBlock, useNow } from "./TxTracker";
import { Card, Empty, Stat, td, th, Zec } from "./ui";

export function LiveMempool({ initial, chain }: { initial: Mempool; chain: ChainContext | null }) {
  const [m, setM] = useState(initial);
  const [lastBlockAt, setLastBlockAt] = useState(() =>
    chain?.lastBlockAt ? Date.parse(chain.lastBlockAt) : null,
  );
  const now = useNow();
  useLive(async (e) => {
    if (e.type === "block") setLastBlockAt(Date.now());
    const next = await fetch("/v1/mempool").then((r) => r.json());
    setM(next);
  });
  const T = chain?.blockTime ?? 75;
  const elapsed = now != null && lastBlockAt != null ? (now - lastBlockAt) / 1000 : null;
  const onTime = (fee: number | null, actions: number) =>
    paysConventional(fee, actions, chain?.marginalFee, chain?.graceActions);
  const ready = m.txs.filter((t) => onTime(t.fee, t.n_actions)).length;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <Stat label="Pending txs" value={int(m.count)} />
        <Stat label="Total size" value={bytes(m.total_size)} />
        <Stat label="Pending fees" value={<Zec zat={m.total_fees} />} />
      </div>
      <div className="card grid gap-4 p-4 md:grid-cols-[1fr_auto] md:items-center">
        <NextBlock elapsed={elapsed} blockTime={T} label="Next block" />
        <div className="space-y-1 text-sm md:min-w-64 md:text-right">
          <p className="text-muted">
            50% within <b className="text-text">{duration(blockQuantile(0.5, T))}</b> · 90% within{" "}
            <b className="text-text">{duration(blockQuantile(0.9, T))}</b>
          </p>
          <p className="text-muted">
            <b className="text-good">{int(ready)}</b> of {int(m.txs.length)} pending txs pay the ZIP-317 fee and should make it
          </p>
        </div>
      </div>
      <Card
        pad={false}
        title={
          <span className="flex items-center gap-2">
            Pending transactions <LiveDot />
          </span>
        }
      >
        {m.txs.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead className="border-b border-border">
                <tr>
                  <th className={th}>Transaction</th>
                  <th className={th}>Type</th>
                  <th className={th}>Seen</th>
                  <th className={th}>ETA</th>
                  <th className={th}>Size</th>
                  <th className={`${th} text-right`}>Fee</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {m.txs.map((t) => (
                  <tr key={t.txid} className="animate-[row-in_1.2s_ease-out] hover:bg-surface-2/60">
                    <td className={td}>
                      <Link href={`/tx/${t.txid}`} className="font-mono text-link hover:text-link-hover">
                        {short(t.txid, 10, 6)}
                      </Link>
                    </td>
                    <td className={td}>
                      <KindBadge kind={t.kind} />
                    </td>
                    <td className={`${td} text-muted`}>
                      <TimeAgo iso={t.seen_at} />
                    </td>
                    <td className={`${td} whitespace-nowrap`}>
                      {onTime(t.fee, t.n_actions) ? (
                        <span className="text-good">Next block</span>
                      ) : (
                        <span className="text-warn" title="Fee below the ZIP-317 conventional fee">
                          Delayed (low fee)
                        </span>
                      )}
                    </td>
                    <td className={`${td} num text-muted`}>{bytes(t.size)}</td>
                    <td className={`${td} text-right`}>
                      <Zec zat={t.fee} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty>The mempool is empty. The last block cleared everything.</Empty>
        )}
      </Card>
    </div>
  );
}

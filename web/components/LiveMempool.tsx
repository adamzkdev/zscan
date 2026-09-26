"use client";

import Link from "next/link";
import { useState } from "react";
import { bytes, int, short } from "@/lib/format";
import type { Mempool } from "@/lib/types";
import { KindBadge } from "./KindBadge";
import { LiveDot } from "./LiveHome";
import { useLive } from "./live";
import { TimeAgo } from "./TimeAgo";
import { Card, Empty, Stat, td, th, Zec } from "./ui";

export function LiveMempool({ initial }: { initial: Mempool }) {
  const [m, setM] = useState(initial);
  useLive(async () => {
    const next = await fetch("/v1/mempool").then((r) => r.json());
    setM(next);
  });
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <Stat label="Pending txs" value={int(m.count)} />
        <Stat label="Total size" value={bytes(m.total_size)} />
        <Stat label="Pending fees" value={<Zec zat={m.total_fees} />} />
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
                  <th className={th}>Size</th>
                  <th className={`${th} text-right`}>Fee</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {m.txs.map((t) => (
                  <tr key={t.txid} className="hover:bg-surface-2/60">
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

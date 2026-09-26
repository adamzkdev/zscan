import type { Metadata } from "next";
import Link from "next/link";
import { TimeAgo } from "@/components/TimeAgo";
import { Card, Empty, PageTitle, Pill, tableHead, td, th, Zec } from "@/components/ui";
import { api } from "@/lib/api";
import { int, pct } from "@/lib/format";
import type { Accounts } from "@/lib/types";

export const metadata: Metadata = { title: "Top Accounts by ZEC Balance" };

export default async function AccountsPage() {
  const a = await api<Accounts>("/v1/accounts");
  return (
    <div className="space-y-4">
      <PageTitle title="Top Accounts by ZEC Balance">
        Transparent addresses only: shielded balances are private by design. Ranked among the most active addresses since
        block {int(a.indexed_from)}; balances come from the node and cover full history.
      </PageTitle>
      <Card
        pad={false}
        title={<span className="text-sm font-normal text-muted">Top {a.accounts.length} accounts</span>}
        action={a.updated_at && <span className="text-xs text-muted">Updated <TimeAgo iso={a.updated_at} /></span>}
      >
        {a.accounts.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px]">
              <thead className={tableHead}>
                <tr>
                  <th className={th}>Rank</th>
                  <th className={th}>Address</th>
                  <th className={th}>Name Tag</th>
                  <th className={`${th} text-right`}>Balance</th>
                  <th className={`${th} text-right`}>Percentage</th>
                  <th className={`${th} text-right`}>Txn Count</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {a.accounts.map((x) => (
                  <tr key={x.address} className="hover:bg-surface-2">
                    <td className={`${td} text-muted`}>{x.rank}</td>
                    <td className={td}>
                      <Link href={`/address/${x.address}`} className="font-mono text-link hover:text-link-hover">{x.address}</Link>
                    </td>
                    <td className={td}>{x.label ? <Pill tone="info">{x.label}</Pill> : null}</td>
                    <td className={`${td} text-right`}><Zec zat={x.balance} decimals={4} /></td>
                    <td className={`${td} num text-right`}>{pct(x.share, 3)}</td>
                    <td className={`${td} num text-right`}>{int(x.tx_count)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty>Computing balances… this list refreshes every 10 minutes.</Empty>
        )}
      </Card>
    </div>
  );
}

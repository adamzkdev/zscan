import type { Metadata } from "next";
import Link from "next/link";
import { Hash } from "@/components/Hash";
import { TimeAgo } from "@/components/TimeAgo";
import { Card, Empty, PageTitle, tableHead, td, th } from "@/components/ui";
import { apiOrNull } from "@/lib/api";
import { IndexingStarting } from "@/app/loading-state";
import { int } from "@/lib/format";
import type { Zrc20List } from "@/lib/types";
import { Amount, Progress } from "@/components/Zrc20";

export const metadata: Metadata = {
  title: "ZRC-20 Tokens",
  description: "ZRC-20 tokens deployed on Zcash through inscriptions: supply, mint progress and holders.",
};

const SORTS: [string, string][] = [
  ["holders", "Holders"],
  ["mints", "Mints"],
  ["progress", "Progress"],
  ["recent", "Newest"],
];

export default async function TokensPage(props: PageProps<"/tokens">) {
  const sp = await props.searchParams;
  const sort = typeof sp.sort === "string" && SORTS.some(([s]) => s === sp.sort) ? sp.sort : "holders";
  const page = Math.max(0, Number(sp.page) || 0);
  const d = await apiOrNull<Zrc20List>(`/v1/zrc20?sort=${sort}&page=${page}&limit=50`);
  if (!d) return <IndexingStarting />;
  const pages = Math.ceil(d.total / 50);
  const link = (p: { sort?: string; page?: number }) => {
    const q = new URLSearchParams();
    const s = p.sort ?? sort;
    if (s !== "holders") q.set("sort", s);
    if (p.page) q.set("page", String(p.page));
    return `/tokens${q.size ? `?${q}` : ""}`;
  };

  return (
    <div className="space-y-4">
      <PageTitle title="ZRC-20 Tokens" eyebrow={`${int(d.total)} deployed`}>
        Tokens written as JSON inscriptions: a deploy sets the ticker, max supply and per-mint limit, mints claim supply, and
        a transfer inscription moves balance when its output is spent. Balances follow the rules of the open-source{" "}
        <a href="https://github.com/cloutprotocol/zord" className="text-link hover:text-link-hover" target="_blank" rel="noopener noreferrer">
          zord
        </a>{" "}
        indexer; other indexers can count partial mints differently.
      </PageTitle>

      <div className="flex flex-wrap gap-1.5">
        {SORTS.map(([s, label]) => (
          <Link
            key={s}
            href={link({ sort: s, page: 0 })}
            className={`rounded-md border px-3 py-1 text-sm transition-colors ${
              sort === s ? "border-link bg-link text-white" : "border-border bg-surface text-text hover:text-link"
            }`}
          >
            {label}
          </Link>
        ))}
      </div>

      <Card pad={false}>
        {d.tokens.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead className={tableHead}>
                <tr>
                  <th className={th}>#</th>
                  <th className={th}>Token</th>
                  <th className={th}>Minted</th>
                  <th className={`${th} text-right`}>Max supply</th>
                  <th className={`${th} text-right`}>Limit / mint</th>
                  <th className={`${th} text-right`}>Holders</th>
                  <th className={`${th} text-right`}>Mints</th>
                  <th className={th}>Deployed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {d.tokens.map((t, n) => (
                  <tr key={t.tick} className="hover:bg-surface-2">
                    <td className={`${td} num text-muted`}>{page * 50 + n + 1}</td>
                    <td className={td}>
                      <Link href={`/token/${t.tick}`} className="font-medium uppercase text-link hover:text-link-hover">
                        {t.tick}
                      </Link>
                    </td>
                    <td className={`${td} w-48`}>
                      <Progress value={t.progress} />
                    </td>
                    <td className={`${td} num text-right`}>
                      <Amount v={t.max} />
                    </td>
                    <td className={`${td} num text-right text-muted`}>
                      <Amount v={t.lim} />
                    </td>
                    <td className={`${td} num text-right`}>{int(t.holders)}</td>
                    <td className={`${td} num text-right`}>{int(t.mints)}</td>
                    <td className={td}>
                      <span className="flex flex-col">
                        <TimeAgo iso={t.time} />
                        <span className="text-xs text-faint">
                          <Hash value={t.deployer} href={`/address/${t.deployer}`} head={6} tail={4} />
                        </span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty>No tokens deployed yet.</Empty>
        )}
        {pages > 1 && (
          <div className="flex items-center justify-end gap-2 border-t border-border px-4 py-3 text-sm">
            {page > 0 && <Link href={link({ page: page - 1 })} className="rounded-md border border-border px-3 py-1 text-link hover:bg-surface-2">‹ Prev</Link>}
            <span className="text-muted">
              Page {page + 1} of {pages}
            </span>
            {page + 1 < pages && <Link href={link({ page: page + 1 })} className="rounded-md border border-border px-3 py-1 text-link hover:bg-surface-2">Next ›</Link>}
          </div>
        )}
      </Card>
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { IndexingStarting } from "@/app/loading-state";
import { chip } from "@/components/NftMarket";
import { NftImage } from "@/components/NftImage";
import { Badges } from "@/components/NftProject";
import { Sparkline } from "@/components/Sparkline";
import { Card, Empty, PageTitle, Stat, tableHead, td, th, Zec } from "@/components/ui";
import { apiOrNull } from "@/lib/api";
import { int } from "@/lib/format";
import type { CollectionRow } from "@/lib/types";

export const metadata: Metadata = {
  title: "Zcash NFT Collections: floor prices, volume and sales",
  description: "Every Zcash NFT collection ranked by volume, floor and sales, on chain and on marketplaces, with daily history.",
};

const SORTS: [string, string][] = [
  ["new", "Newest"],
  ["vol7", "Volume 7d"],
  ["vol24", "Volume 24h"],
  ["sales", "Sales 7d"],
  ["floor", "Floor"],
];

function sortRows(rows: CollectionRow[], sort: string) {
  const by = (f: (c: CollectionRow) => number) => [...rows].sort((a, b) => f(b) - f(a));
  switch (sort) {
    case "vol7":
      return by((c) => c.activity?.volume_7d ?? -1);
    case "vol24":
      return by((c) => c.activity?.volume_24h ?? -1);
    case "sales":
      return by((c) => c.activity?.sales_7d ?? -1);
    case "floor":
      return by((c) => c.market?.floor ?? -1);
    default:
      return rows;
  }
}

function launchedLabel(d: string | null) {
  if (!d) return null;
  return new Date(`${d}T00:00:00Z`).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" });
}

export default async function CollectionsPage(props: PageProps<"/collections">) {
  const sp = await props.searchParams;
  const rows = await apiOrNull<CollectionRow[]>("/v1/collections");
  if (!rows) return <IndexingStarting />;
  const sort = SORTS.some(([s]) => s === sp.sort) ? String(sp.sort) : "new";
  const list = sortRows(rows, sort);
  const sum = (f: (c: CollectionRow) => number | undefined) => rows.reduce((n, c) => n + (f(c) ?? 0), 0);
  const traded = rows.filter((c) => (c.activity?.sales_7d ?? 0) > 0).length;

  return (
    <div className="space-y-4">
      <PageTitle title="NFT Collections">
        Every Zcash NFT collection in one place. On-chain collections are read from the chain (items, owners, sales). For collections kept by a marketplace, ZScan archives
        the marketplace&apos;s sales and order book to build their history. Each page lists its sources.
      </PageTitle>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Volume 24h" value={<Zec zat={sum((c) => c.activity?.volume_24h)} decimals={1} showUsd />} sub={`${int(sum((c) => c.activity?.sales_24h))} sales`} />
        <Stat label="Volume 7d" value={<Zec zat={sum((c) => c.activity?.volume_7d)} decimals={0} showUsd />} sub={`${int(sum((c) => c.activity?.sales_7d))} sales`} />
        <Stat label="Volume 30d" value={<Zec zat={sum((c) => c.activity?.volume_30d)} decimals={0} />} sub={`${int(sum((c) => c.activity?.sales_30d))} sales`} />
        <Stat label="Collections" value={int(rows.length)} sub={`${traded} traded this week`} />
      </div>

      <Card
        title="Ranking"
        pad={false}
        action={
          <div className="flex flex-wrap gap-1.5 text-xs">
            {SORTS.map(([s, label]) => (
              <Link key={s} href={s === "new" ? "/collections" : `/collections?sort=${s}`} scroll={false} className={chip(sort === s)}>
                {label}
              </Link>
            ))}
          </div>
        }
      >
        {list.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px]">
              <thead className={tableHead}>
                <tr>
                  <th className={`${th} w-10`}>#</th>
                  <th className={th}>Collection</th>
                  <th className={`${th} text-right`}>Floor</th>
                  <th className={`${th} text-right`}>Volume 24h</th>
                  <th className={`${th} text-right`}>Volume 7d</th>
                  <th className={`${th} text-right`}>Sales 7d</th>
                  <th className={`${th} text-right`}>Items</th>
                  <th className={`${th} text-right`}>Owners</th>
                  <th className={`${th} text-right`}>14 days</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {list.map((c, n) => {
                  const a = c.activity;
                  const o = c.onchain;
                  const m = c.market;
                  const href = `/collection/${encodeURIComponent(c.slug)}`;
                  return (
                    <tr key={c.slug} className="hover:bg-surface-2">
                      <td className={`${td} num text-muted`}>{n + 1}</td>
                      <td className={td}>
                        <Link href={href} className="group flex items-center gap-3">
                          <span className="size-10 shrink-0 overflow-hidden rounded-md border border-border bg-surface-2">
                            {c.image ? <NftImage src={c.image} fallback="" /> : null}
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate font-medium text-link group-hover:text-link-hover">{c.name}</span>
                            <span className="mt-0.5 flex flex-wrap items-center gap-1 text-[11px] text-muted">
                              <Badges c={c} />
                              {c.launched && <span className="ml-1">{launchedLabel(c.launched)}</span>}
                            </span>
                          </span>
                        </Link>
                      </td>
                      <td className={`${td} text-right`}>
                        {m?.floor != null ? <Zec zat={m.floor} decimals={m.floor >= 1e8 ? 2 : 4} iconSize={12} /> : <span className="text-faint">—</span>}
                        {a?.floor_change_24h != null && (
                          <span className={`block text-[11px] ${a.floor_change_24h >= 0 ? "text-good" : "text-bad"}`}>
                            {a.floor_change_24h >= 0 ? "+" : "−"}
                            {Math.abs(a.floor_change_24h).toFixed(1)}%
                          </span>
                        )}
                      </td>
                      <td className={`${td} text-right`}>{a?.volume_24h ? <Zec zat={a.volume_24h} decimals={a.volume_24h >= 100e8 ? 0 : 2} iconSize={12} /> : <span className="text-faint">—</span>}</td>
                      <td className={`${td} text-right`}>{a?.volume_7d ? <Zec zat={a.volume_7d} decimals={a.volume_7d >= 100e8 ? 0 : 2} iconSize={12} /> : <span className="text-faint">—</span>}</td>
                      <td className={`${td} num text-right`}>{a?.sales_7d ? int(a.sales_7d) : <span className="text-faint">—</span>}</td>
                      <td className={`${td} num text-right`}>{o ? int(o.unique_items) : c.supply != null ? int(c.supply) : "—"}</td>
                      <td className={`${td} num text-right`}>
                        {o ? int(o.holders) : m?.owners != null ? int(m.owners) : <span className="text-muted" title="Held by shielded addresses; the marketplace doesn't publish them">Private</span>}
                      </td>
                      <td className={`${td} text-right`}>
                        <span className="inline-block" title="Daily volume, last 14 days">
                          {a && a.daily_volume.some((v) => v > 0) ? <Sparkline values={a.daily_volume} width={88} height={24} color="var(--link)" /> : <span className="text-faint">—</span>}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty>No collections indexed yet.</Empty>
        )}
        <p className="border-t border-border px-4 py-2 text-xs text-muted">
          Volumes count sales detected on chain for inscription collections, and sales archived from the marketplace for collections kept off chain.
        </p>
      </Card>

      <p className="text-sm">
        Missing a collection?{" "}
        <a
          href="https://github.com/adamzkdev/zscan-nft-registry/issues/new?template=collection.yml"
          target="_blank"
          rel="noopener noreferrer"
          className="text-link hover:text-link-hover"
        >
          Submit it
        </a>{" "}
        <span className="text-muted">
          through the{" "}
          <a href="https://github.com/adamzkdev/zscan-nft-registry" target="_blank" rel="noopener noreferrer" className="hover:text-link">
            public registry
          </a>
          .
        </span>
      </p>
    </div>
  );
}

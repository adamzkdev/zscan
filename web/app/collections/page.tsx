import type { Metadata } from "next";
import Link from "next/link";
import { NftImage } from "@/components/NftImage";
import { Badges } from "@/components/NftProject";
import { Card, Empty, PageTitle, Zec } from "@/components/ui";
import { apiOrNull } from "@/lib/api";
import { IndexingStarting } from "@/app/loading-state";
import { int } from "@/lib/format";
import type { CollectionRow } from "@/lib/types";

export const metadata: Metadata = {
  title: "Zcash NFT Collections",
  description: "Zcash NFT collections, newest first: items, holders, floor prices and sales.",
};

function Figures({ c }: { c: CollectionRow }) {
  const o = c.onchain;
  const m = c.market;
  const volume = o && o.volume > 0 ? o.volume : m?.volume;
  return (
    <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
      <div>
        <p className="text-muted">Items</p>
        <p className="num font-medium">{o ? int(o.unique_items) : c.supply != null ? int(c.supply) : "—"}</p>
      </div>
      <div>
        <p className="text-muted">Floor</p>
        <p className="num font-medium">{m?.floor != null ? <Zec zat={m.floor} decimals={4} iconSize={11} /> : "—"}</p>
      </div>
      <div>
        <p className="text-muted">Volume</p>
        <p className="num font-medium">{volume ? <Zec zat={volume} decimals={volume >= 100e8 ? 0 : 2} iconSize={11} /> : "—"}</p>
      </div>
    </div>
  );
}

function launchedLabel(d: string | null) {
  if (!d) return null;
  return new Date(`${d}T00:00:00Z`).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" });
}

export default async function CollectionsPage() {
  const rows = await apiOrNull<CollectionRow[]>("/v1/collections");
  if (!rows) return <IndexingStarting />;

  return (
    <div className="space-y-4">
      <PageTitle title="NFT Collections">
        Zcash NFT collections, newest first. On-chain collections are read from the chain (items, owners, sales); collections
        kept by a marketplace show that marketplace&apos;s figures. Each page lists its sources.
      </PageTitle>

      {rows.length ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((c) => (
            <Link key={c.slug} href={`/collection/${encodeURIComponent(c.slug)}`} className="card group flex overflow-hidden hover:border-link">
              <div className="size-32 shrink-0 border-r border-border bg-surface-2">
                {c.image ? <NftImage src={c.image} fallback={c.name} /> : <div className="flex size-full items-center justify-center p-2 text-center text-xs text-muted">{c.name}</div>}
              </div>
              <div className="min-w-0 flex-1 p-3.5">
                <p className="flex items-baseline justify-between gap-2">
                  <span className="truncate font-medium text-link group-hover:text-link-hover">{c.name}</span>
                  {c.launched && <span className="shrink-0 text-[11px] text-muted">{launchedLabel(c.launched)}</span>}
                </p>
                <p className="mt-1 flex flex-wrap gap-1">
                  <Badges c={c} />
                </p>
                <Figures c={c} />
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <Card>
          <Empty>No collections indexed yet.</Empty>
        </Card>
      )}
    </div>
  );
}

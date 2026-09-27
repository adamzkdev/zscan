import type { Metadata } from "next";
import Link from "next/link";
import { imageUrl } from "@/components/Inscription";
import { NftImage } from "@/components/NftImage";
import { TimeAgo } from "@/components/TimeAgo";
import { Card, Empty, PageTitle, Pill } from "@/components/ui";
import { apiOrNull } from "@/lib/api";
import { IndexingStarting } from "@/app/loading-state";
import { int } from "@/lib/format";
import type { CollectionRow } from "@/lib/types";

export const metadata: Metadata = {
  title: "Zcash NFT Collections",
  description: "ZRC-721 NFT collections inscribed on Zcash: items, holders and supply.",
};

export default async function CollectionsPage() {
  const rows = await apiOrNull<CollectionRow[]>("/v1/collections");
  if (!rows) return <IndexingStarting />;

  return (
    <div className="space-y-4">
      <PageTitle title="NFT Collections" eyebrow="ZRC-721">
        Collections inscribed on Zcash. A deploy inscription names the collection, its supply and the IPFS folder holding each
        item&apos;s metadata and image; each item is an inscription minted into it and owned like any other.
      </PageTitle>
      {rows.length ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((c) => (
            <Link key={c.name} href={`/collection/${encodeURIComponent(c.name)}`} className="card group flex overflow-hidden hover:border-link">
              <div className="size-28 shrink-0 border-r border-border bg-surface-2">
                {c.cover && <NftImage src={imageUrl(c.cover)} fallback={c.name} />}
              </div>
              <div className="min-w-0 flex-1 p-4">
                <p className="flex items-center gap-2">
                  <span className="truncate font-medium text-link group-hover:text-link-hover">{c.name}</span>
                  {!c.deployed && <Pill tone="warn">No deploy</Pill>}
                </p>
                <p className="num mt-1 text-sm">
                  {int(c.items)} {c.supply != null && <span className="text-muted">/ {int(c.supply)}</span>} items
                </p>
                <p className="num text-xs text-muted">
                  {int(c.holders)} holders{c.shielded > 0 && ` · ${int(c.shielded)} shielded`}
                </p>
                <p className="mt-1 text-xs text-faint">
                  Last mint <TimeAgo iso={c.last_time} />
                </p>
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

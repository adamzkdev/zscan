import type { Metadata } from "next";
import Link from "next/link";
import { imageUrl } from "@/components/Inscription";
import { NftImage } from "@/components/NftImage";
import { NftSalesTable } from "@/components/NftSales";
import { Card, Empty, PageTitle, Pill, Zec } from "@/components/ui";
import { apiOrNull } from "@/lib/api";
import { IndexingStarting } from "@/app/loading-state";
import { int } from "@/lib/format";
import type { CollectionRow, NftSale, OffchainCollection } from "@/lib/types";

export const metadata: Metadata = {
  title: "Zcash NFT Collections",
  description: "NFT collections on Zcash: ZRC-721 collections and launchpad drops, with holders, sales and floor prices.",
};

function Kind({ c }: { c: CollectionRow }) {
  return c.kind === "zrc721" ? <Pill>ZRC-721</Pill> : <Pill tone="info">Launchpad drop</Pill>;
}

export default async function CollectionsPage() {
  const [rows, sales, offchain] = await Promise.all([
    apiOrNull<CollectionRow[]>("/v1/collections"),
    apiOrNull<NftSale[]>("/v1/nft-sales").catch(() => null),
    apiOrNull<OffchainCollection[]>("/v1/offchain-collections").catch(() => null),
  ]);
  if (!rows) return <IndexingStarting />;

  return (
    <div className="space-y-4">
      <PageTitle title="NFT Collections">
        Collections inscribed on Zcash. <b>ZRC-721</b> collections are declared on chain by a deploy inscription.{" "}
        <b>Launchpad drops</b> are grouped from their mint transactions (every mint paid the same creator), with names from
        public sources. Sales are detected on chain whatever the marketplace; floor prices come from the collection&apos;s own market.
      </PageTitle>

      {rows.length ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((c) => (
            <Link key={c.slug} href={`/collection/${encodeURIComponent(c.slug)}`} className="card group flex overflow-hidden hover:border-link">
              <div className="size-32 shrink-0 border-r border-border bg-surface-2">{c.cover && <NftImage src={imageUrl(c.cover)} fallback={c.name} />}</div>
              <div className="min-w-0 flex-1 p-4">
                <p className="flex flex-wrap items-center gap-2">
                  <span className="truncate font-medium text-link group-hover:text-link-hover">{c.name}</span>
                  <Kind c={c} />
                </p>
                <p className="num mt-1 text-sm">
                  {int(c.unique_items)} unique items{" "}
                  <span className="text-muted">
                    ({int(c.items)} mints{c.supply != null && `, ${int(c.supply)} declared`})
                  </span>
                </p>
                <p className="num text-xs text-muted">
                  {int(c.holders)} holders{c.shielded > 0 && ` · ${int(c.shielded)} shielded`}
                </p>
                <p className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-muted">
                  {c.market?.floor != null && (
                    <span className="flex items-center gap-1">
                      Floor <Zec zat={c.market.floor} decimals={4} iconSize={11} />
                    </span>
                  )}
                  {c.sales > 0 && (
                    <span className="flex items-center gap-1">
                      {int(c.sales)} sales · <Zec zat={c.volume} decimals={2} iconSize={11} />
                    </span>
                  )}
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

      <Card title="Latest NFT sales" pad={false}>
        <NftSalesTable sales={sales ?? []} />
      </Card>

      {offchain && offchain.length > 0 && (
        <Card title="Off-chain collections" pad={false}>
          <p className="border-b border-border px-4 py-2.5 text-xs text-muted">
            These NFTs aren&apos;t Zcash inscriptions: they live in their marketplace&apos;s own records, so ZScan can&apos;t verify them.
            Figures are as the venue reports them.
          </p>
          <ul className="divide-y divide-border">
            {offchain.map((o) => (
              <li key={o.name} className="flex flex-wrap items-center gap-x-6 gap-y-1 px-4 py-3 text-sm">
                <a href={o.url} target="_blank" rel="noopener noreferrer" className="font-medium text-link hover:text-link-hover">
                  {o.name} ↗
                </a>
                <span className="text-muted">{o.venue}</span>
                {o.supply != null && <span className="num">{int(o.supply)} items</span>}
                {o.floor_zec && <span className="num">Floor {o.floor_zec} ZEC</span>}
                {o.volume_24h_zec && <span className="num text-muted">24h {Number(o.volume_24h_zec).toFixed(2)} ZEC ({int(o.sales_24h ?? 0)} sales)</span>}
                {o.volume_total_zec && <span className="num text-muted">Total {Number(o.volume_total_zec).toFixed(0)} ZEC</span>}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

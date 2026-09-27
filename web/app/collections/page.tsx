import type { Metadata } from "next";
import Link from "next/link";
import { NftImage } from "@/components/NftImage";
import { Badges, KIND_LABEL, KIND_NOTE } from "@/components/NftProject";
import { NftSalesTable } from "@/components/NftSales";
import { Card, Empty, PageTitle, Zec } from "@/components/ui";
import { apiOrNull } from "@/lib/api";
import { IndexingStarting } from "@/app/loading-state";
import { int } from "@/lib/format";
import type { CollectionRow, NftKind, NftSale } from "@/lib/types";

export const metadata: Metadata = {
  title: "Zcash NFT Collections",
  description:
    "Every Zcash NFT project: on-chain inscription collections with owners and sales read from the chain, and marketplace, ZSA and other projects with their links and market figures.",
};

const SECTIONS: { kinds: NftKind[]; title: string }[] = [
  { kinds: ["inscription"], title: "On-chain collections" },
  { kinds: ["marketplace"], title: "Marketplace collections" },
  { kinds: ["zsa-testnet", "other-chain", "upcoming"], title: "ZSA testnet, other chains and upcoming" },
];

function Figures({ c }: { c: CollectionRow }) {
  const o = c.onchain;
  const m = c.market;
  const floor = m?.floor;
  const volume = o && o.volume > 0 ? o.volume : m?.volume;
  return (
    <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
      <div>
        <p className="text-muted">Items</p>
        <p className="num font-medium">{o ? int(o.unique_items) : c.supply != null ? int(c.supply) : "—"}</p>
      </div>
      <div>
        <p className="text-muted">{o ? "Holders" : "Floor"}</p>
        <p className="num font-medium">{o ? int(o.holders) : floor != null ? <Zec zat={floor} decimals={4} iconSize={11} /> : "—"}</p>
      </div>
      <div>
        <p className="text-muted">{o ? "Floor" : "Volume"}</p>
        <p className="num font-medium">
          {o ? (floor != null ? <Zec zat={floor} decimals={4} iconSize={11} /> : "—") : volume != null ? <Zec zat={volume} decimals={0} iconSize={11} /> : "—"}
        </p>
      </div>
    </div>
  );
}

function CollectionCard({ c }: { c: CollectionRow }) {
  return (
    <Link href={`/collection/${encodeURIComponent(c.slug)}`} className="card group flex overflow-hidden hover:border-link">
      <div className="size-32 shrink-0 border-r border-border bg-surface-2">
        {c.image ? <NftImage src={c.image} fallback={c.name} /> : <div className="flex size-full items-center justify-center p-2 text-center text-xs text-muted">{c.name}</div>}
      </div>
      <div className="min-w-0 flex-1 p-3.5">
        <p className="truncate font-medium text-link group-hover:text-link-hover">{c.name}</p>
        <p className="mt-1 flex flex-wrap gap-1">
          <Badges c={c} />
        </p>
        <Figures c={c} />
      </div>
    </Link>
  );
}

export default async function CollectionsPage() {
  const [rows, sales] = await Promise.all([
    apiOrNull<CollectionRow[]>("/v1/collections"),
    apiOrNull<NftSale[]>("/v1/nft-sales").catch(() => null),
  ]);
  if (!rows) return <IndexingStarting />;

  return (
    <div className="space-y-6">
      <PageTitle title="NFT Collections">
        Every Zcash NFT project we know of, labelled by how far it can be verified. On-chain collections are read from the chain:
        items, owners and sales. For the others, ZScan shows each project&apos;s public links and its marketplace&apos;s figures.
        Project facts come from{" "}
        <a href="https://github.com/adamzkdev/zscan/blob/main/labels/nft_projects.json" className="text-link hover:text-link-hover" target="_blank" rel="noopener noreferrer">
          a public registry
        </a>{" "}
        where every entry cites its sources.
      </PageTitle>

      {SECTIONS.map(({ kinds, title }) => {
        const list = rows.filter((r) => kinds.includes(r.kind));
        if (!list.length) return null;
        return (
          <section key={title} className="space-y-3">
            <div>
              <h2 className="text-base font-medium">{title}</h2>
              <p className="text-xs text-muted">{kinds.map((k) => `${KIND_LABEL[k]}: ${KIND_NOTE[k]}`).join(" ")}</p>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((c) => (
                <CollectionCard key={c.slug} c={c} />
              ))}
            </div>
          </section>
        );
      })}

      <Card title="Latest on-chain NFT sales" pad={false}>
        {sales ? <NftSalesTable sales={sales} /> : <Empty>Sales unavailable.</Empty>}
      </Card>
    </div>
  );
}

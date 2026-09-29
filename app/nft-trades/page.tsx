import type { Metadata } from "next";
import Link from "next/link";
import { IndexingStarting } from "@/app/loading-state";
import { Hash } from "@/components/Hash";
import { imageUrl, inscriptionName } from "@/components/Inscription";
import { NftImage } from "@/components/NftImage";
import { TimeAgo } from "@/components/TimeAgo";
import { Card, Empty, PageTitle, tableHead, td, th, Zec } from "@/components/ui";
import { apiOrNull } from "@/lib/api";
import type { CollectionDetail, CollectionRow, NftSale } from "@/lib/types";

export const metadata: Metadata = {
  title: "Latest Zcash NFT Trades",
  description: "The latest NFT sales on Zcash, on chain and on marketplaces, across every collection.",
};

type Trade = {
  key: string;
  name: string;
  href: string;
  image: string | null;
  collection: { name: string; href: string } | null;
  price: number;
  time: string;
  venue: string;
  seller: string | null;
  buyer: string | null;
  txid: string | null;
};

const MEDIA_WITH_IMAGE = ["image", "svg", "collection", "ipfs"];

export default async function NftTradesPage() {
  const [rows, chain] = await Promise.all([apiOrNull<CollectionRow[]>("/v1/collections"), apiOrNull<NftSale[]>("/v1/nft-sales")]);
  if (!rows && !chain) return <IndexingStarting />;

  // Marketplace collections keep their sales off chain; their detail carries the venue's latest.
  const venues = await Promise.all(
    (rows ?? []).filter((c) => c.kind === "marketplace").map((c) => apiOrNull<CollectionDetail>(`/v1/collections/${encodeURIComponent(c.slug)}`)),
  );
  const byKey = new Map((rows ?? []).filter((c) => c.onchain).map((c) => [c.onchain!.key, c]));

  const trades: Trade[] = [
    ...(chain ?? []).map((s) => {
      const c = s.collection ? byKey.get(s.collection) : undefined;
      return {
        key: `${s.txid}${s.id}`,
        name: inscriptionName(s),
        href: `/inscription/${s.id}`,
        image: MEDIA_WITH_IMAGE.includes(s.media) ? imageUrl(s.id) : null,
        collection: c ? { name: c.name, href: `/collection/${encodeURIComponent(c.slug)}` } : null,
        price: s.price,
        time: s.time,
        venue: "On chain",
        seller: s.seller,
        buyer: s.buyer,
        txid: s.txid,
      };
    }),
    ...venues.flatMap((c) => {
      if (!c) return [];
      const base = `/collection/${encodeURIComponent(c.slug)}`;
      return c.venue_sales.map((s, n) => ({
        key: `${c.slug}-${s.item_id}-${s.time}-${n}`,
        name: s.name,
        href: `${base}/item/${s.item_id}`,
        image: `/v1/collections/${encodeURIComponent(c.slug)}/items/${s.item_id}/image`,
        collection: { name: c.name, href: base },
        price: s.price,
        time: s.time,
        venue: c.market?.venue ?? "Marketplace",
        seller: null,
        buyer: null,
        txid: null,
      }));
    }),
  ].sort((a, b) => b.time.localeCompare(a.time));

  return (
    <div className="space-y-4">
      <PageTitle title="Latest Trades">
        NFT sales on Zcash across every collection. On-chain sales are read from the chain; marketplace sales are as the marketplace reports them, without
        buyers or sellers.
      </PageTitle>
      <Card pad={false}>
        {trades.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead className={tableHead}>
                <tr>
                  <th className={th}>Item</th>
                  <th className={th}>Collection</th>
                  <th className={`${th} text-right`}>Price</th>
                  <th className={th}>Venue</th>
                  <th className={th}>Seller</th>
                  <th className={th}>Buyer</th>
                  <th className={th}>Age</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {trades.map((t) => (
                  <tr key={t.key} className="hover:bg-surface-2">
                    <td className={td}>
                      <Link href={t.href} className="flex items-center gap-2 text-link hover:text-link-hover">
                        <span className="size-9 shrink-0 overflow-hidden rounded border border-border bg-surface-2">
                          {t.image && <NftImage src={t.image} fallback="" />}
                        </span>
                        <span className="num">{t.name}</span>
                      </Link>
                    </td>
                    <td className={td}>
                      {t.collection ? (
                        <Link href={t.collection.href} className="text-link hover:text-link-hover">
                          {t.collection.name}
                        </Link>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                    <td className={`${td} text-right`}>
                      <Zec zat={t.price} decimals={4} showUsd />
                    </td>
                    <td className={`${td} text-muted`}>{t.venue}</td>
                    <td className={td}>{t.seller ? <Hash value={t.seller} href={`/address/${t.seller}`} head={6} tail={4} /> : <span className="text-muted">—</span>}</td>
                    <td className={td}>{t.buyer ? <Hash value={t.buyer} href={`/address/${t.buyer}`} head={6} tail={4} /> : <span className="text-muted">—</span>}</td>
                    <td className={`${td} text-muted`}>
                      {t.txid ? (
                        <Link href={`/tx/${t.txid}`} className="hover:text-link">
                          <TimeAgo iso={t.time} />
                        </Link>
                      ) : (
                        <TimeAgo iso={t.time} />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty>No trades yet.</Empty>
        )}
      </Card>
    </div>
  );
}

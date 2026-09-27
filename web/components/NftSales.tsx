import Link from "next/link";
import type { NftSale } from "@/lib/types";
import { Hash } from "./Hash";
import { imageUrl, inscriptionName } from "./Inscription";
import { NftImage } from "./NftImage";
import { TimeAgo } from "./TimeAgo";
import { Empty, tableHead, td, th, Zec } from "./ui";

/** Marketplace sales detected on chain. */
export function NftSalesTable({ sales }: { sales: NftSale[] }) {
  if (!sales.length) return <Empty>No sales detected yet.</Empty>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[820px]">
        <thead className={tableHead}>
          <tr>
            <th className={th}>Item</th>
            <th className={`${th} text-right`}>Price</th>
            <th className={th}>Seller</th>
            <th className={th}>Buyer</th>
            <th className={th}>Age</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {sales.map((s) => (
            <tr key={`${s.txid}${s.id}`} className="hover:bg-surface-2">
              <td className={td}>
                <Link href={`/inscription/${s.id}`} className="flex items-center gap-2 text-link hover:text-link-hover">
                  <span className="size-9 shrink-0 overflow-hidden rounded border border-border bg-surface-2">
                    {["image", "svg", "collection", "ipfs"].includes(s.media) && <NftImage src={imageUrl(s.id)} fallback="" />}
                  </span>
                  <span className="num">{inscriptionName(s)}</span>
                </Link>
              </td>
              <td className={`${td} text-right`}>
                <Zec zat={s.price} decimals={4} />
              </td>
              <td className={td}>{s.seller ? <Hash value={s.seller} href={`/address/${s.seller}`} head={6} tail={4} /> : "—"}</td>
              <td className={td}>{s.buyer ? <Hash value={s.buyer} href={`/address/${s.buyer}`} head={6} tail={4} /> : "—"}</td>
              <td className={`${td} text-muted`}>
                <Link href={`/tx/${s.txid}`} className="hover:text-link">
                  <TimeAgo iso={s.time} />
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { NftImage } from "@/components/NftImage";
import { Badges, KIND_NOTE } from "@/components/NftProject";
import { TimeAgo } from "@/components/TimeAgo";
import { Card, Empty, PageTitle, Rows, tableHead, td, th, Zec } from "@/components/ui";
import { apiOrNull } from "@/lib/api";
import { int } from "@/lib/format";
import type { CollectionRow, VenueItemDetail } from "@/lib/types";

/** An item kept by a marketplace (off-chain projects such as zkSNARKs). */
async function load(name: string, id: string) {
  const slug = encodeURIComponent(decodeURIComponent(name));
  const [c, item] = await Promise.all([
    apiOrNull<CollectionRow>(`/v1/collections/${slug}`),
    apiOrNull<VenueItemDetail>(`/v1/collections/${slug}/items/${encodeURIComponent(id)}`),
  ]);
  return c && item ? { c, item } : null;
}

export async function generateMetadata(props: PageProps<"/collection/[name]/item/[id]">): Promise<Metadata> {
  const { name, id } = await props.params;
  const d = await load(name, id);
  return { title: d ? d.item.name : "NFT" };
}

const LABEL: Record<string, string> = {
  snark_minted: "Minted",
  listing_created: "Listed",
  listing_cancelled: "Listing cancelled",
  order_paid: "Sale",
  snark_transferred: "Transferred",
};

export default async function VenueItemPage(props: PageProps<"/collection/[name]/item/[id]">) {
  const { name, id } = await props.params;
  const d = await load(name, id);
  if (!d) notFound();
  const { c, item } = d;
  const base = `/collection/${encodeURIComponent(c.slug)}`;

  return (
    <div className="space-y-4">
      <PageTitle
        title={
          <span className="flex flex-wrap items-center gap-2">
            {item.name}
            <Link href={base} className="text-base font-normal text-link hover:text-link-hover">
              {c.name}
            </Link>
            <Badges c={c} />
          </span>
        }
      />
      <p className="rounded-md border border-border bg-surface-2 px-3 py-2 text-xs text-muted">{KIND_NOTE[c.kind]}</p>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,420px)_1fr]">
        <div className="card aspect-square overflow-hidden bg-surface-2">
          <NftImage src={`/v1/collections/${encodeURIComponent(c.slug)}/items/${item.id}/image`} fallback={item.name} />
        </div>
        <Card title="Overview" pad={false}>
          <Rows
            rows={[
              ["Collection", <Link key="c" href={base} className="text-link hover:text-link-hover">{c.name}</Link>],
              item.rank != null ? ["Rarity rank", `${int(item.rank)} of ${int(c.supply ?? 0)}`, "1 is the rarest, as ranked by the marketplace."] : null,
              ["Listed at", item.ask != null ? <Zec key="a" zat={item.ask} decimals={4} showUsd /> : "Not listed"],
              item.last != null ? ["Last sale", <Zec key="l" zat={item.last} decimals={4} />] : null,
              item.minted_at ? ["Minted", <TimeAgo key="m" iso={item.minted_at} />] : null,
              item.description ? ["Description", item.description] : null,
              [
                "Marketplace",
                <a key="u" href={item.url} target="_blank" rel="noopener noreferrer" className="text-link hover:text-link-hover">
                  View on {c.market?.venue ?? "marketplace"} ↗
                </a>,
              ],
            ]}
          />
        </Card>
      </div>

      {item.traits.length > 0 && (
        <Card title="Traits">
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            {item.traits.map((t) => (
              <li key={t.trait_type} className="rounded-lg border border-border bg-surface-2 px-3 py-2">
                <p className="text-[11px] uppercase tracking-wide text-muted">{t.trait_type}</p>
                <p className="text-sm font-medium">{t.value}</p>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card title="History (as the marketplace reports it)" pad={false}>
        {item.history.length ? (
          <table className="w-full">
            <thead className={tableHead}>
              <tr>
                <th className={th}>Event</th>
                <th className={`${th} text-right`}>Price</th>
                <th className={th}>Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {item.history.map((h, n) => (
                <tr key={n}>
                  <td className={td}>{LABEL[h.kind] ?? h.kind.replace(/_/g, " ")}</td>
                  <td className={`${td} text-right`}>{h.price != null ? <Zec zat={h.price} decimals={4} /> : "—"}</td>
                  <td className={`${td} text-muted`}>{h.time ? <TimeAgo iso={h.time} /> : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <Empty>No history.</Empty>
        )}
      </Card>
    </div>
  );
}

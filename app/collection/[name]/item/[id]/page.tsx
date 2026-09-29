import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ItemSalesChart } from "@/components/charts/NftMarketChart";
import { NftHistory } from "@/components/NftHistory";
import { NftImage } from "@/components/NftImage";
import { Badges, KIND_NOTE } from "@/components/NftProject";
import { TimeAgo } from "@/components/TimeAgo";
import { Card, PageTitle, Rows, Zec } from "@/components/ui";
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
            <Link href={base} className="inline-flex items-center gap-1 text-base font-normal text-link hover:text-link-hover">
              {c.name}
              <Badges c={c} size={16} />
            </Link>
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
              item.last != null ? ["Last sale", <Zec key="l" zat={item.last} decimals={4} showUsd />] : null,
              item.bid != null ? ["Best bid", <Zec key="b" zat={item.bid} decimals={4} showUsd />] : null,
              item.tier
                ? [
                    "Comparable items",
                    <span key="t" className="flex flex-wrap items-center gap-x-2">
                      <span className="text-muted">
                        Rank {int(item.tier.from_rank)}–{int(item.tier.to_rank)}:
                      </span>
                      floor {item.tier.floor != null ? <Zec zat={item.tier.floor} decimals={3} iconSize={12} /> : "—"}
                      <span className="text-muted">·</span>
                      median 7d {item.tier.median_7d != null ? <Zec zat={item.tier.median_7d} decimals={3} iconSize={12} /> : "—"}
                      <span className="text-xs text-muted">({int(item.tier.sales_7d)} sales)</span>
                    </span>,
                    "Items of similar rarity: their lowest ask and what they sold for over the last 7 days.",
                  ]
                : null,
              item.sales.length ? ["Times sold", int(item.sales.length), "Sales on record in ZScan's archive of the marketplace."] : null,
              c.kind === "marketplace" ? ["Owner", "Private", "The marketplace keeps the owner's shielded address to itself, and payments are shielded."] : null,
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
        <Card title="Traits" action={<span className="text-xs text-muted">share of the collection · trait floor</span>}>
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            {item.traits.map((t) => {
              const st = item.trait_stats.find((x) => x.trait_type === t.trait_type && x.value === t.value);
              return (
                <li key={t.trait_type}>
                  <Link
                    href={`${base}?traits=${encodeURIComponent(`${t.trait_type}:${t.value}`)}&sort=price`}
                    className="block rounded-lg border border-border bg-surface-2 px-3 py-2 hover:border-link"
                  >
                    <p className="text-[11px] uppercase tracking-wide text-muted">{t.trait_type}</p>
                    <p className="text-sm font-medium">{t.value}</p>
                    {st && (
                      <p className="mt-0.5 flex items-center justify-between gap-1 text-[11px] text-muted">
                        <span>{st.pct < 1 ? st.pct.toFixed(2) : st.pct.toFixed(1)}%</span>
                        {st.floor != null && <Zec zat={st.floor} decimals={3} iconSize={10} />}
                      </p>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      {item.sales.length > 1 && (
        <Card title="Sale prices">
          <ItemSalesChart sales={item.sales} />
        </Card>
      )}

      <Card title="History (as the marketplace reports it)" pad={false}>
        <NftHistory events={item.history} />
      </Card>
    </div>
  );
}

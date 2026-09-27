import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { Hash } from "@/components/Hash";
import { InscriptionGrid } from "@/components/Inscription";
import { NftImage } from "@/components/NftImage";
import { Badges, KIND_NOTE, ProjectLinks } from "@/components/NftProject";
import { NftSalesTable } from "@/components/NftSales";
import { TimeAgo } from "@/components/TimeAgo";
import { Card, Empty, PageTitle, Rows, Stat, tableHead, td, th, Zec } from "@/components/ui";
import { apiOrNull } from "@/lib/api";
import { int, utc } from "@/lib/format";
import type { CollectionDetail } from "@/lib/types";

async function load(name: string, qs = "") {
  return apiOrNull<CollectionDetail>(`/v1/collections/${encodeURIComponent(decodeURIComponent(name))}${qs}`);
}

export async function generateMetadata(props: PageProps<"/collection/[name]">): Promise<Metadata> {
  const { name } = await props.params;
  const c = await load(name);
  return { title: c ? `${c.name} NFT collection` : "NFT collection", description: c?.project?.description };
}

const SORTS: [string, string][] = [
  ["id", "Number"],
  ["rank", "Rarity"],
  ["price", "Price"],
];

type Row = [ReactNode, ReactNode] | [ReactNode, ReactNode, string] | null;

export default async function CollectionPage(props: PageProps<"/collection/[name]">) {
  const { name } = await props.params;
  const sp = await props.searchParams;
  const cursor = Number(sp.cursor) || undefined;
  const page = Math.max(0, Number(sp.page) || 0);
  const sort = typeof sp.sort === "string" && SORTS.some(([s]) => s === sp.sort) ? sp.sort : "id";
  const art = sp.view === "art";
  const qs = new URLSearchParams();
  if (art) qs.set("view", "art");
  if (cursor) qs.set("cursor", String(cursor));
  if (page) qs.set("page", String(page));
  if (sort !== "id") qs.set("sort", sort);
  const c = await load(name, qs.size ? `?${qs}` : "");
  if (!c) notFound();
  const base = `/collection/${encodeURIComponent(c.slug)}`;
  const itemImage = (id: string) => `/v1/collections/${encodeURIComponent(c.slug)}/items/${id}/image`;
  const o = c.onchain;
  const m = c.market;
  const p = c.project;
  const venueLink = (q: { page?: number; sort?: string }) => {
    const u = new URLSearchParams();
    const s = q.sort ?? sort;
    if (s !== "id") u.set("sort", s);
    if (q.page) u.set("page", String(q.page));
    return `${base}${u.size ? `?${u}` : ""}`;
  };

  const overview: Row[] = [
    p?.minted_at ? ["Minted", p.minted_at] : o ? ["Minted", <span key="t">{utc(o.first_time)} → <TimeAgo iso={o.last_time} /></span>] : null,
    p?.mint_price_zec != null ? ["Mint price", p.mint_price_zec === 0 ? "Free" : `${p.mint_price_zec} ZEC`] : null,
    o?.kind === "zrc721"
      ? o.deploy_inscription
        ? [
            "Deploy inscription",
            <Link key="d" href={`/inscription/${o.deploy_inscription}`} className="break-all font-mono text-xs text-link hover:text-link-hover">
              {o.deploy_inscription}
            </Link>,
            "The first deploy of this name defines the collection.",
          ]
        : ["Deploy inscription", <span key="d" className="text-muted">None on chain</span>]
      : null,
    o?.creator
      ? o.kind === "drop"
        ? ["Creator", <Hash key="c" value={o.creator} href={`/address/${o.creator}`} full />, "The address every mint's commit transaction paid the most."]
        : ["Deployer", <Hash key="c" value={o.creator} href={`/address/${o.creator}`} full />]
      : null,
    c.meta ? ["Metadata", <span key="m" className="break-all font-mono text-xs">{c.meta}</span>, "Folder holding <item>.json with each item’s name, image and traits."] : null,
    p
      ? [
          "Sources",
          <ul key="s" className="space-y-0.5">
            {p.sources.map((s) => (
              <li key={s.url}>
                <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-link hover:text-link-hover">
                  {s.label} ↗
                </a>
              </li>
            ))}
          </ul>,
          "Where each fact on this page comes from.",
        ]
      : null,
  ];

  return (
    <div className="space-y-4">
      <PageTitle
        title={
          <span className="flex flex-wrap items-center gap-3">
            <span className="size-12 shrink-0 overflow-hidden rounded-lg border border-border bg-surface-2">{c.image && <NftImage src={c.image} fallback="" />}</span>
            {c.name}
            <span className="flex flex-wrap gap-1">
              <Badges c={c} />
            </span>
          </span>
        }
      >
        {p?.description ??
          (o?.kind === "drop" ? "Launchpad mints grouped by the creator address every commit transaction paid. No public source names this collection yet." : null)}
      </PageTitle>

      {p && <ProjectLinks p={p} />}
      <p className="rounded-md border border-border bg-surface-2 px-3 py-2 text-xs text-muted">{KIND_NOTE[c.kind]}</p>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          label="Items"
          value={o ? int(o.unique_items) : c.supply != null ? int(c.supply) : "—"}
          sub={
            o
              ? `${int(o.items)} mints${o.unique_items < o.items ? " (duplicates included)" : ""}${c.supply != null ? ` · ${int(c.supply)} declared` : ""}`
              : m?.minted != null
                ? `${int(m.minted)} minted`
                : c.supply != null
                  ? "declared supply"
                  : undefined
          }
        />
        <Stat
          label={o ? "Holders" : "Sales"}
          value={o ? int(o.holders) : m?.sales != null ? int(m.sales) : "—"}
          sub={o ? (o.shielded > 0 ? `${int(o.shielded)} items shielded` : undefined) : m?.sales_24h != null ? `${int(m.sales_24h)} in 24h` : undefined}
        />
        <Stat
          label="Floor"
          value={m?.floor != null ? <Zec zat={m.floor} decimals={4} /> : "—"}
          sub={
            m ? (
              <a href={m.url} target="_blank" rel="noopener noreferrer" className="text-link hover:text-link-hover">
                {m.listings != null ? `${int(m.listings)} listed on ` : "on "}
                {m.venue}
              </a>
            ) : (
              "No marketplace figures"
            )
          }
        />
        <Stat
          label={o ? "Volume (on chain)" : "Volume"}
          value={o ? <Zec zat={o.volume} decimals={2} /> : m?.volume != null ? <Zec zat={m.volume} decimals={2} /> : "—"}
          sub={
            o ? (
              <>
                {int(o.sales)} sales{o.last_price != null && <> · last <Zec zat={o.last_price} decimals={4} iconSize={11} /></>}
              </>
            ) : m?.volume_24h != null ? (
              <>
                <Zec zat={m.volume_24h} decimals={2} iconSize={11} /> in 24h
              </>
            ) : undefined
          }
        />
      </div>

      <Card title="Overview" pad={false}>
        <Rows rows={overview} />
      </Card>

      {o && (
        <Card
          title={art ? `All artworks (${int(c.artworks_total ?? 0)})` : `Minted items (${int(o.unique_items)})`}
          pad={false}
          action={
            c.artworks_total ? (
              <div className="flex gap-1.5 text-xs">
                <Link href={base} className={`rounded-md border px-2 py-0.5 ${!art ? "border-link bg-link text-white" : "border-border hover:text-link"}`}>
                  Minted
                </Link>
                <Link href={`${base}?view=art`} className={`rounded-md border px-2 py-0.5 ${art ? "border-link bg-link text-white" : "border-border hover:text-link"}`}>
                  All artworks
                </Link>
              </div>
            ) : undefined
          }
        >
          {art ? (
            <>
              <p className="border-b border-border px-4 py-2 text-xs text-muted">
                Every artwork the collection declares, from its metadata. {int(o.unique_items)} of {int(c.artworks_total ?? 0)} have been minted on Zcash; the others are still available to mint.
              </p>
              <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                {c.artworks.map((a) => {
                  const inner = (
                    <>
                      <div className="aspect-square border-b border-border bg-surface-2">
                        <NftImage src={a.image} fallback={a.name} />
                      </div>
                      <div className="flex items-center justify-between gap-2 px-3 py-2">
                        <span className="num truncate text-sm font-medium">{a.name}</span>
                        <span className={`shrink-0 text-[11px] ${a.inscription ? "text-good" : "text-muted"}`}>{a.inscription ? "Minted" : "Available"}</span>
                      </div>
                    </>
                  );
                  return a.inscription ? (
                    <Link key={a.id} href={`/inscription/${a.inscription}`} className="card block overflow-hidden hover:border-link">
                      {inner}
                    </Link>
                  ) : (
                    <div key={a.id} className="card overflow-hidden opacity-80">
                      {inner}
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-end gap-2 border-t border-border px-4 py-3 text-sm">
                {page > 0 && <Link href={`${base}?view=art&page=${page - 1}`} className="rounded-md border border-border px-3 py-1 text-link hover:bg-surface-2">‹ Prev</Link>}
                {(page + 1) * 48 < (c.artworks_total ?? 0) && <Link href={`${base}?view=art&page=${page + 1}`} className="rounded-md border border-border px-3 py-1 text-link hover:bg-surface-2">Next ›</Link>}
              </div>
            </>
          ) : (
            <div className="p-4">{c.items_page.length ? <InscriptionGrid items={c.items_page} /> : <Empty>No items.</Empty>}</div>
          )}
          {!art && (cursor || c.next) && (
            <div className="flex justify-end gap-2 border-t border-border px-4 py-3 text-sm">
              {cursor && <Link href={base} className="rounded-md border border-border px-3 py-1 text-link hover:bg-surface-2">« First</Link>}
              {c.next && <Link href={`${base}?cursor=${c.next}`} className="rounded-md border border-border px-3 py-1 text-link hover:bg-surface-2">Next ›</Link>}
            </div>
          )}
        </Card>
      )}

      {c.venue_items.length > 0 && (
        <Card
          title={`Items (${int(c.venue_total ?? c.venue_items.length)})`}
          pad={false}
          action={
            <div className="flex gap-1.5 text-xs">
              {SORTS.map(([s, label]) => (
                <Link key={s} href={venueLink({ sort: s, page: 0 })} className={`rounded-md border px-2 py-0.5 ${sort === s ? "border-link bg-link text-white" : "border-border hover:text-link"}`}>
                  {label}
                </Link>
              ))}
            </div>
          }
        >
          <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {c.venue_items.map((it) => (
              <Link key={it.id} href={`${base}/item/${it.id}`} className="card group block overflow-hidden hover:border-link">
                <div className="aspect-square border-b border-border bg-surface-2">
                  <NftImage src={itemImage(it.id)} fallback={it.name} />
                </div>
                <div className="px-3 py-2">
                  <p className="num truncate text-sm font-medium text-link group-hover:text-link-hover">{it.name}</p>
                  <p className="flex items-center justify-between text-[11px] text-muted">
                    <span>{it.rank != null ? `Rank ${int(it.rank)}` : ""}</span>
                    {it.ask != null && <Zec zat={it.ask} decimals={3} iconSize={10} />}
                  </p>
                </div>
              </Link>
            ))}
          </div>
          <div className="flex justify-end gap-2 border-t border-border px-4 py-3 text-sm">
            {page > 0 && <Link href={venueLink({ page: page - 1 })} className="rounded-md border border-border px-3 py-1 text-link hover:bg-surface-2">‹ Prev</Link>}
            {(page + 1) * 48 < (c.venue_total ?? 0) && <Link href={venueLink({ page: page + 1 })} className="rounded-md border border-border px-3 py-1 text-link hover:bg-surface-2">Next ›</Link>}
          </div>
        </Card>
      )}

      {o && (
        <Card title="Latest sales (on chain)" pad={false}>
          <NftSalesTable sales={c.recent_sales} />
        </Card>
      )}

      {c.venue_sales.length > 0 && (
        <Card title={`Latest sales on ${m?.venue ?? "the marketplace"}`} pad={false}>
          <p className="border-b border-border px-4 py-2 text-xs text-muted">As the marketplace reports them; buyers and sellers aren&apos;t published.</p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px]">
              <thead className={tableHead}>
                <tr>
                  <th className={th}>Item</th>
                  <th className={`${th} text-right`}>Price</th>
                  <th className={th}>Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {c.venue_sales.map((s, n) => (
                  <tr key={n} className="hover:bg-surface-2">
                    <td className={td}>
                      <Link href={`${base}/item/${s.item_id}`} className="flex items-center gap-2 text-link hover:text-link-hover">
                        <span className="size-9 shrink-0 overflow-hidden rounded border border-border bg-surface-2">
                          <NftImage src={itemImage(s.item_id)} fallback="" />
                        </span>
                        {s.name}
                      </Link>
                    </td>
                    <td className={`${td} text-right`}>
                      <Zec zat={s.price} decimals={4} />
                    </td>
                    <td className={`${td} text-muted`}>
                      <TimeAgo iso={s.time} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {o && (
        <Card title="Top holders" pad={false}>
          {c.holders_list.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[480px]">
                <thead className={tableHead}>
                  <tr>
                    <th className={th}>Rank</th>
                    <th className={th}>Address</th>
                    <th className={`${th} text-right`}>Items</th>
                    <th className={`${th} text-right`}>Share</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {c.holders_list.map((h, n) => (
                    <tr key={h.address} className="hover:bg-surface-2">
                      <td className={`${td} num text-muted`}>{n + 1}</td>
                      <td className={td}>
                        <Hash value={h.address} href={`/address/${h.address}`} head={10} tail={8} />
                      </td>
                      <td className={`${td} num text-right`}>{int(h.count)}</td>
                      <td className={`${td} num text-right`}>{((h.count / o.items) * 100).toFixed(2)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty>No transparent holders.</Empty>
          )}
        </Card>
      )}
    </div>
  );
}

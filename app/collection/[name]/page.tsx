import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { Hash } from "@/components/Hash";
import { InscriptionGrid } from "@/components/Inscription";
import { Analytics, chip, Pager, TraitFilters, TraitTable, VenueItemCard } from "@/components/NftMarket";
import { NftImage } from "@/components/NftImage";
import { NftMap } from "@/components/nft-map/NftMap";
import { Badges, KIND_NOTE, ProjectLinks } from "@/components/NftProject";
import { NftSalesTable } from "@/components/NftSales";
import { TimeAgo } from "@/components/TimeAgo";
import { Card, Empty, PageTitle, Rows, Stat, tableHead, td, th, Zec } from "@/components/ui";
import { apiOrNull } from "@/lib/api";
import { int, utc } from "@/lib/format";
import type { CollectionDetail, CollectionStats } from "@/lib/types";

const PAGE = 48;

async function load(name: string, qs = "") {
  return apiOrNull<CollectionDetail>(`/v1/collections/${encodeURIComponent(decodeURIComponent(name))}${qs}`);
}

export async function generateMetadata(props: PageProps<"/collection/[name]">): Promise<Metadata> {
  const { name } = await props.params;
  const c = await load(name);
  return {
    title: c ? `${c.name} NFT collection: floor, volume, sales` : "NFT collection",
    description: c?.project?.description ?? (c ? `${c.name}: Zcash NFT collection items, floor price, volume and sales history.` : undefined),
  };
}

const SORTS: [string, string][] = [
  ["id", "Number"],
  ["rank", "Rarity"],
  ["price", "Price ↑"],
  ["price_desc", "Price ↓"],
  ["last", "Last sale"],
  ["bid", "Top bid"],
];
const STATUSES: [string, string][] = [
  ["", "All"],
  ["listed", "Listed"],
  ["bids", "Has bid"],
  ["sold", "Sold before"],
];

type Row = [ReactNode, ReactNode] | [ReactNode, ReactNode, string] | null;
type Tab = "items" | "analytics" | "traits" | "sales" | "map" | "holders";

const str = (v: string | string[] | undefined) => (typeof v === "string" ? v : "");

export default async function CollectionPage(props: PageProps<"/collection/[name]">) {
  const { name } = await props.params;
  const sp = await props.searchParams;
  const cursor = Number(sp.cursor) || undefined;
  const page = Math.max(0, Math.floor(Number(sp.page)) || 0);
  const sort = SORTS.some(([s]) => s === sp.sort) ? str(sp.sort) : "id";
  const status = STATUSES.some(([s]) => s && s === sp.status) ? str(sp.status) : "";
  const q = str(sp.q).trim().slice(0, 12);
  const traits = str(sp.traits)
    .split(",")
    .filter((t) => t.includes(":"))
    .slice(0, 40);
  const view = sp.view === "art" || sp.view === "minted" ? sp.view : "";
  const qs = new URLSearchParams();
  if (view) qs.set("view", view);
  if (cursor) qs.set("cursor", String(cursor));
  if (page) qs.set("page", String(page));
  if (sort !== "id") qs.set("sort", sort);
  if (traits.length) qs.set("traits", traits.join(","));
  if (status) qs.set("status", status);
  if (q) qs.set("q", q);
  const slugParam = encodeURIComponent(decodeURIComponent(name));
  const [c, stats] = await Promise.all([load(name, qs.size ? `?${qs}` : ""), apiOrNull<CollectionStats>(`/v1/collections/${slugParam}/stats`)]);
  if (!c) notFound();

  const base = `/collection/${encodeURIComponent(c.slug)}`;
  // The API opens mostly unminted collections on every artwork.
  const art = c.artworks.length > 0;
  const itemImage = (id: string) => `/v1/collections/${encodeURIComponent(c.slug)}/items/${id}/image`;
  const o = c.onchain;
  const m = c.market;
  const p = c.project;
  const a = stats?.activity ?? c.activity;
  const venue = c.venue_total != null;
  const total = o && !m?.volume ? o.volume : (m?.volume ?? stats?.recorded_volume ?? null);
  const tabs: [Tab, string][] = [
    ["items", "Items"],
    ["analytics", "Analytics"],
    ...(venue && stats?.traits.length ? ([["traits", "Traits"]] as [Tab, string][]) : []),
    ...(o || c.venue_sales.length ? ([["sales", "Sales"]] as [Tab, string][]) : []),
    ...(venue ? ([["map", "Map"]] as [Tab, string][]) : []),
    ...(o ? ([["holders", "Holders"]] as [Tab, string][]) : []),
  ];
  const tab: Tab = tabs.some(([t]) => t === sp.tab) ? (sp.tab as Tab) : "items";
  const tabHref = (t: Tab) => (t === "items" ? base : `${base}?tab=${t}`);

  const itemsHref = (x: { sort?: string; traits?: string[]; status?: string; q?: string; page?: number }) => {
    const u = new URLSearchParams();
    const s = x.sort ?? sort;
    if (s !== "id") u.set("sort", s);
    const t = x.traits ?? traits;
    if (t.length) u.set("traits", t.join(","));
    const st = x.status ?? status;
    if (st) u.set("status", st);
    const qq = x.q ?? q;
    if (qq) u.set("q", qq);
    if (x.page) u.set("page", String(x.page));
    return `${base}${u.size ? `?${u}` : ""}`;
  };
  const toggleTrait = (key: string) => itemsHref({ traits: traits.includes(key) ? traits.filter((t) => t !== key) : [...traits, key] });
  const filtered = traits.length > 0 || !!status || !!q;
  const types = [...new Set((stats?.traits ?? []).map((t) => t.trait_type))];
  const traitType = types.includes(str(sp.trait)) ? str(sp.trait) : types[0];

  // Rendered twice: collapsed behind a "Filters" toggle on phones, as a sidebar on desktop.
  const filterPanel = (
    <>
      <Card title="Filters">
        <div className="space-y-3">
          <form action={base} method="get" className="flex gap-1.5">
            {sort !== "id" && <input type="hidden" name="sort" value={sort} />}
            {status && <input type="hidden" name="status" value={status} />}
            {traits.length > 0 && <input type="hidden" name="traits" value={traits.join(",")} />}
            <input
              name="q"
              defaultValue={q}
              inputMode="numeric"
              placeholder="Item number"
              aria-label="Item number"
              className="min-w-0 flex-1 rounded-md border border-border bg-surface px-2 py-1 text-sm"
            />
            <button type="submit" className="rounded-md border border-border px-2.5 py-1 text-sm text-link hover:bg-surface-2">
              Go
            </button>
          </form>
          <div className="flex flex-wrap gap-1.5 text-xs">
            {STATUSES.map(([s, label]) => (
              <Link key={s || "all"} href={itemsHref({ status: s, page: 0 })} scroll={false} className={chip(status === s)}>
                {label}
              </Link>
            ))}
          </div>
        </div>
      </Card>
      {stats && stats.traits.length > 0 && <TraitFilters traits={stats.traits} selected={traits} toggle={toggleTrait} />}
    </>
  );

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
    c.kind === "marketplace"
      ? ["Owners", "Private", "Owners sign in to the marketplace with a shielded address and it doesn't publish them. Payments are shielded too, so nothing on chain links an item to its owner."]
      : null,
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
            <span className="inline-flex items-center gap-2">
              {c.name}
              <Badges c={c} size={24} />
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
          label={o ? "Holders" : "Owners"}
          value={o ? int(o.holders) : m?.owners != null ? int(m.owners) : "Private"}
          sub={o ? (o.shielded > 0 ? `${int(o.shielded)} items shielded` : undefined) : m?.owners != null ? undefined : "Held by shielded addresses"}
        />
        <Stat
          label="Floor"
          value={m?.floor != null ? <Zec zat={m.floor} decimals={4} showUsd /> : "—"}
          sub={
            m ? (
              <span className="flex flex-wrap items-center gap-x-1.5">
                {a?.floor_change_24h != null && (
                  <span className={a.floor_change_24h >= 0 ? "text-good" : "text-bad"}>
                    {a.floor_change_24h >= 0 ? "▲" : "▼"} {Math.abs(a.floor_change_24h).toFixed(1)}%
                  </span>
                )}
                <a href={m.url} target="_blank" rel="noopener noreferrer" className="text-link hover:text-link-hover">
                  {m.listings != null ? `${int(m.listings)} listed on ` : "on "}
                  {m.venue}
                </a>
              </span>
            ) : (
              "No marketplace figures"
            )
          }
        />
        <Stat
          label="Volume 24h"
          value={a ? <Zec zat={a.volume_24h} decimals={2} showUsd /> : m?.volume_24h != null ? <Zec zat={m.volume_24h} decimals={2} showUsd /> : "—"}
          sub={
            <>
              {a ? `${int(a.sales_24h)} sales · ` : ""}
              total{" "}
              {total != null ? <Zec zat={total} decimals={total >= 100e8 ? 0 : 2} iconSize={11} /> : "—"}
            </>
          }
        />
      </div>

      <nav className="flex gap-1 overflow-x-auto overflow-y-hidden border-b border-border [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" aria-label="Sections">
        {tabs.map(([t, label]) => (
          <Link
            key={t}
            href={tabHref(t)}
            scroll={false}
            className={`-mb-px whitespace-nowrap border-b-2 px-3 py-2 text-sm ${tab === t ? "border-link font-medium text-link" : "border-transparent text-muted hover:text-text"}`}
          >
            {label}
          </Link>
        ))}
      </nav>

      {tab === "analytics" && (stats ? <Analytics c={c} s={stats} slug={c.slug} /> : <Card><Empty>Analytics unavailable right now.</Empty></Card>)}

      {tab === "map" && (
        <NftMap
          slug={c.slug}
          name={c.name}
          initial={{ map: str(sp.map), order: str(sp.order), by: str(sp.by), size: str(sp.size), show: str(sp.show), match: str(sp.match) }}
        />
      )}

      {tab === "traits" && stats && traitType && (
        <TraitTable
          traits={stats.traits}
          types={types}
          type={traitType}
          typeHref={(t) => `${base}?tab=traits&trait=${encodeURIComponent(t)}`}
          itemsHref={(key) => itemsHref({ traits: [key], status: "", q: "", sort: "price", page: 0 })}
        />
      )}

      {tab === "items" && venue && (
        <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
          <details className="card group lg:hidden">
            <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-medium">
              <span>
                Filters
                {filtered && <span className="ml-2 rounded-full bg-link px-1.5 py-px text-[11px] text-white">{traits.length + (status ? 1 : 0) + (q ? 1 : 0)}</span>}
              </span>
              <span className="text-xs text-muted transition-transform group-open:rotate-180">▾</span>
            </summary>
            <div className="space-y-3 border-t border-border p-3">{filterPanel}</div>
          </details>
          <aside className="hidden space-y-3 lg:block">{filterPanel}</aside>

          <Card
            title={`${filtered ? "Matching items" : "Items"} (${int(c.venue_total ?? 0)})`}
            pad={false}
            action={
              <div className="flex flex-wrap gap-1.5 text-xs">
                {SORTS.map(([s, label]) => (
                  <Link key={s} href={itemsHref({ sort: s, page: 0 })} scroll={false} className={chip(sort === s)}>
                    {label}
                  </Link>
                ))}
              </div>
            }
          >
            {filtered && (
              <div className="flex flex-wrap items-center gap-1.5 border-b border-border px-4 py-2 text-xs">
                {traits.map((t) => (
                  <Link key={t} href={toggleTrait(t)} scroll={false} className="rounded-full border border-border bg-surface-2 px-2 py-0.5 hover:border-link">
                    {t.replace(":", ": ")} ×
                  </Link>
                ))}
                {status && (
                  <Link href={itemsHref({ status: "" })} scroll={false} className="rounded-full border border-border bg-surface-2 px-2 py-0.5 hover:border-link">
                    {STATUSES.find(([s]) => s === status)?.[1]} ×
                  </Link>
                )}
                {q && (
                  <Link href={itemsHref({ q: "" })} scroll={false} className="rounded-full border border-border bg-surface-2 px-2 py-0.5 hover:border-link">
                    #{q} ×
                  </Link>
                )}
                <Link href={sort !== "id" ? `${base}?sort=${sort}` : base} scroll={false} className="ml-1 text-link hover:text-link-hover">
                  Clear all
                </Link>
              </div>
            )}
            {c.venue_items.length ? (
              <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
                {c.venue_items.map((it) => (
                  <VenueItemCard key={it.id} it={it} href={`${base}/item/${it.id}`} image={itemImage(it.id)} />
                ))}
              </div>
            ) : (
              <Empty>No items match these filters.</Empty>
            )}
            <Pager page={page} pages={Math.ceil((c.venue_total ?? 0) / PAGE)} href={(n) => itemsHref({ page: n })} base={itemsHref({ page: 0 })} />
          </Card>
        </div>
      )}

      {tab === "items" && o && (
        <Card
          title={art ? `All artworks (${int(c.artworks_total ?? 0)})` : `Minted items (${int(o.unique_items)})`}
          pad={false}
          action={
            c.artworks_total ? (
              <div className="flex gap-1.5 text-xs">
                <Link href={`${base}?view=minted`} className={chip(!art)}>
                  Minted
                </Link>
                <Link href={`${base}?view=art`} className={chip(art)}>
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
                {c.artworks.map((w) => {
                  const inner = (
                    <>
                      <div className="aspect-square border-b border-border bg-surface-2">
                        <NftImage src={w.image} fallback={w.name} />
                      </div>
                      <div className="flex items-center justify-between gap-2 px-3 py-2">
                        <span className="num truncate text-sm font-medium">{w.name}</span>
                        <span className={`shrink-0 text-[11px] ${w.inscription ? "text-good" : "text-muted"}`}>{w.inscription ? "Minted" : "Available"}</span>
                      </div>
                    </>
                  );
                  return w.inscription ? (
                    <Link key={w.id} href={`/inscription/${w.inscription}`} className="card block overflow-hidden hover:border-link">
                      {inner}
                    </Link>
                  ) : (
                    <div key={w.id} className="card overflow-hidden opacity-80">
                      {inner}
                    </div>
                  );
                })}
              </div>
              <Pager page={page} pages={Math.ceil((c.artworks_total ?? 0) / PAGE)} href={(n) => `${base}?view=art${n ? `&page=${n}` : ""}`} base={`${base}?view=art`} />
            </>
          ) : (
            <>
              <div className="p-4">{c.items_page.length ? <InscriptionGrid items={c.items_page} /> : <Empty>No items.</Empty>}</div>
              {(cursor || c.next) && (
                <div className="flex justify-end gap-2 border-t border-border px-4 py-3 text-sm">
                  {cursor && (
                    <Link href={`${base}?view=minted`} className="rounded-md border border-border px-3 py-1 text-link hover:bg-surface-2">
                      « First
                    </Link>
                  )}
                  {c.next && (
                    <Link href={`${base}?cursor=${c.next}`} className="rounded-md border border-border px-3 py-1 text-link hover:bg-surface-2">
                      Next ›
                    </Link>
                  )}
                </div>
              )}
            </>
          )}
        </Card>
      )}

      {tab === "sales" && o && (
        <Card title="Latest sales (on chain)" pad={false}>
          <NftSalesTable sales={c.recent_sales} />
        </Card>
      )}

      {tab === "sales" && c.venue_sales.length > 0 && (
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
                      <Zec zat={s.price} decimals={4} showUsd />
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

      {tab === "holders" && o && (
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

      <Card title="Overview" pad={false}>
        <Rows rows={overview} />
      </Card>
    </div>
  );
}

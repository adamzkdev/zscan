import Link from "next/link";
import type { ReactNode } from "react";
import { NftMarketChart } from "@/components/charts/NftMarketChart";
import { NftImage } from "@/components/NftImage";
import { PageJump } from "@/components/PageJump";
import { TimeAgo } from "@/components/TimeAgo";
import { Card, Empty, Stat, tableHead, td, th, Zec } from "@/components/ui";
import { int } from "@/lib/format";
import type { CollectionRow, CollectionStats, TraitValue, VenueItem } from "@/lib/types";

const linkBtn = "rounded-md border border-border px-2.5 py-1 text-link hover:bg-surface-2";
const chip = (on: boolean) =>
  `rounded-md border px-2 py-0.5 ${on ? "border-link bg-link text-white" : "border-border text-text hover:text-link"}`;

/** Numbered pagination: first, neighbours and last page, with a "go to page" box. */
export function Pager({ page, pages, href, base }: { page: number; pages: number; href: (p: number) => string; base: string }) {
  if (pages <= 1) return null;
  const shown = [...new Set([0, page - 2, page - 1, page, page + 1, page + 2, pages - 1])].filter((p) => p >= 0 && p < pages).sort((a, b) => a - b);
  const out: ReactNode[] = [];
  shown.forEach((p, i) => {
    if (i && p - shown[i - 1] > 1)
      out.push(
        <span key={`gap${p}`} className="px-1 text-faint">
          …
        </span>,
      );
    out.push(
      <Link key={p} href={href(p)} scroll={false} aria-current={p === page ? "page" : undefined} className={`num min-w-8 rounded-md border px-2 py-1 text-center ${p === page ? "border-link bg-link text-white" : "border-border text-link hover:bg-surface-2"}`}>
        {p + 1}
      </Link>,
    );
  });
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3 text-sm">
      <PageJump base={base} pages={pages} />
      <nav className="flex flex-wrap items-center gap-1" aria-label="Pages">
        {page > 0 && (
          <Link href={href(page - 1)} scroll={false} className={linkBtn}>
            ‹ Prev
          </Link>
        )}
        {out}
        {page + 1 < pages && (
          <Link href={href(page + 1)} scroll={false} className={linkBtn}>
            Next ›
          </Link>
        )}
      </nav>
    </div>
  );
}

/** Trait filters: one collapsible group per trait type; values toggle in the URL. */
export function TraitFilters({ traits, selected, toggle }: { traits: TraitValue[]; selected: string[]; toggle: (key: string) => string }) {
  const types = [...new Set(traits.map((t) => t.trait_type))];
  return (
    <div className="space-y-1">
      {types.map((type) => {
        const values = traits.filter((t) => t.trait_type === type).sort((a, b) => a.count - b.count);
        const active = values.filter((v) => selected.includes(`${type}:${v.value}`)).length;
        return (
          <details key={type} open={active > 0} className="group rounded-md border border-border">
            <summary className="flex cursor-pointer list-none items-center justify-between px-3 py-2 text-sm font-medium">
              <span>
                {type} <span className="text-xs font-normal text-muted">({values.length})</span>
              </span>
              <span className="text-xs text-muted">{active ? `${active} selected` : <span className="transition-transform group-open:rotate-180">▾</span>}</span>
            </summary>
            <ul className="max-h-72 overflow-y-auto border-t border-border py-1 text-xs">
              {values.map((v) => {
                const key = `${type}:${v.value}`;
                const on = selected.includes(key);
                return (
                  <li key={key}>
                    <Link href={toggle(key)} scroll={false} className={`flex items-center gap-2 px-3 py-1.5 hover:bg-surface-2 ${on ? "text-link" : ""}`}>
                      <span className={`flex size-3.5 shrink-0 items-center justify-center rounded-sm border ${on ? "border-link bg-link text-[9px] text-white" : "border-border-strong"}`}>{on ? "✓" : ""}</span>
                      <span className="min-w-0 flex-1 truncate">{v.value}</span>
                      <span className="num text-muted">{int(v.count)}</span>
                      {v.floor != null && (
                        <span className="w-16 text-right">
                          <Zec zat={v.floor} decimals={2} iconSize={9} />
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </details>
        );
      })}
    </div>
  );
}

export function VenueItemCard({ it, href, image }: { it: VenueItem; href: string; image: string }) {
  return (
    <Link href={href} className="card group block overflow-hidden hover:border-link">
      <div className="relative aspect-square border-b border-border bg-surface-2">
        <NftImage src={image} fallback={it.name} />
        {it.rank != null && <span className="num absolute left-1.5 top-1.5 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white">#{int(it.rank)}</span>}
      </div>
      <div className="px-3 py-2">
        <p className="num truncate text-sm font-medium text-link group-hover:text-link-hover">{it.name}</p>
        <div className="mt-0.5 flex items-center justify-between gap-1 text-[11px] text-muted">
          {it.ask != null ? <Zec zat={it.ask} decimals={3} iconSize={10} className="text-text" /> : <span>Not listed</span>}
          {it.last != null && (
            <span className="flex items-center gap-0.5" title="Last sale">
              last <Zec zat={it.last} decimals={2} iconSize={9} />
            </span>
          )}
        </div>
        {it.bid != null && (
          <p className="mt-0.5 flex items-center gap-1 text-[11px] text-good">
            bid <Zec zat={it.bid} decimals={3} iconSize={9} />
          </p>
        )}
      </div>
    </Link>
  );
}

function change(p: number | null) {
  if (p == null || !Number.isFinite(p)) return null;
  const up = p >= 0;
  return (
    <span className={up ? "text-good" : "text-bad"}>
      {up ? "▲" : "▼"} {Math.abs(p).toFixed(1)}%
    </span>
  );
}

/** Market analytics: headline figures, daily chart, rarity bands, depth, deals and top sales. */
export function Analytics({ c, s, slug }: { c: CollectionRow; s: CollectionStats; slug: string }) {
  const a = s.activity;
  const m = c.market;
  const supply = c.supply ?? c.onchain?.unique_items ?? null;
  const base = `/collection/${encodeURIComponent(slug)}`;
  const avg7 = a && a.sales_7d ? a.volume_7d / a.sales_7d : null;
  const depthMax = Math.max(1, ...s.book.depth.map((d) => d.listings));
  const source =
    a?.source === "archive"
      ? `Sales archived by ZScan from ${m?.venue ?? "the marketplace"}${s.first_sale ? `, on record since ${new Date(s.first_sale).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })}` : ""}.`
      : "Sales detected on chain: moves signed SINGLE|ANYONECANPAY, priced by the paired output.";

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Volume 24h" value={a ? <Zec zat={a.volume_24h} decimals={2} showUsd /> : "—"} sub={a ? `${int(a.sales_24h)} sales` : undefined} />
        <Stat label="Volume 7d" value={a ? <Zec zat={a.volume_7d} decimals={1} showUsd /> : "—"} sub={a ? `${int(a.sales_7d)} sales · 30d ${int(a.sales_30d)}` : undefined} />
        <Stat
          label="Floor"
          value={m?.floor != null ? <Zec zat={m.floor} decimals={4} showUsd /> : "—"}
          sub={a?.floor_change_24h != null ? <>{change(a.floor_change_24h)} in 24h</> : m?.floor != null && supply ? <>Market cap <Zec zat={m.floor * supply} decimals={0} iconSize={11} /></> : undefined}
        />
        <Stat label="Average sale 7d" value={avg7 != null ? <Zec zat={Math.round(avg7)} decimals={4} showUsd /> : "—"} sub={s.book.top_bid != null ? <>Top bid <Zec zat={s.book.top_bid} decimals={3} iconSize={11} /></> : undefined} />
        <Stat
          label="Listed"
          value={m?.listings != null ? int(m.listings) : "—"}
          sub={m?.listings != null && supply ? `${((m.listings / supply) * 100).toFixed(1)}% of supply${m.bids != null ? ` · ${int(m.bids)} with bids` : ""}` : undefined}
        />
        <Stat
          label="Days of inventory"
          value={s.days_of_inventory != null ? s.days_of_inventory.toFixed(1) : "—"}
          sub="Listings ÷ average daily sales (7d)"
        />
        <Stat label="Items traded" value={int(s.traded_items)} sub={supply ? `${((s.traded_items / supply) * 100).toFixed(1)}% of supply changed hands` : undefined} />
        <Stat label="Sales on record" value={int(s.recorded_sales)} sub={<><Zec zat={s.recorded_volume} decimals={0} iconSize={11} /> total</>} />
      </div>

      <Card title="Market history" pad={true}>
        {s.history.length ? <NftMarketChart history={s.history} floorSeries={s.floor_series} /> : <Empty>No sales recorded yet.</Empty>}
        <p className="mt-3 text-xs text-muted">
          {source}
          {s.importing && " Past sales are still being imported from each item's history, so older days may be incomplete."}
        </p>
      </Card>

      {s.book.tiers.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-[3fr_2fr]">
          <Card title="Price by rarity" pad={false}>
            <div className="overflow-x-auto">
              <table className="w-full sm:min-w-[520px]">
                <thead className={tableHead}>
                  <tr>
                    <th className={th}>Rank</th>
                    <th className={`${th} hidden text-right sm:table-cell`}>Listed</th>
                    <th className={`${th} text-right`}>Floor</th>
                    <th className={`${th} hidden text-right sm:table-cell`}>Sales 7d</th>
                    <th className={`${th} text-right`}>Median 7d</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {s.book.tiers.map((t) => (
                    <tr key={t.from_rank} className="hover:bg-surface-2">
                      <td className={`${td} num`}>
                        {int(t.from_rank)}–{int(t.to_rank)}
                      </td>
                      <td className={`${td} num hidden text-right text-muted sm:table-cell`}>
                        {int(t.listed)} / {int(t.items)}
                      </td>
                      <td className={`${td} text-right`}>{t.floor != null ? <Zec zat={t.floor} decimals={3} iconSize={11} /> : "—"}</td>
                      <td className={`${td} num hidden text-right sm:table-cell`}>{int(t.sales_7d)}</td>
                      <td className={`${td} text-right`}>{t.median_7d != null ? <Zec zat={t.median_7d} decimals={3} iconSize={11} /> : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="border-t border-border px-4 py-2 text-xs text-muted">Rank 1 is the rarest, as the marketplace ranks it.</p>
          </Card>
          <Card title="Listing depth">
            <ul className="space-y-2 text-xs">
              {s.book.depth.map((d, i) => {
                const lo = i === 0 ? m?.floor ?? null : s.book.depth[i - 1].up_to;
                return (
                  <li key={i} className="grid grid-cols-[7.5rem_1fr_3rem] items-center gap-2">
                    <span className="num text-muted">
                      {d.up_to != null ? (
                        <>
                          {lo != null && `${(lo / 1e8).toLocaleString("en-US", { maximumFractionDigits: 2 })}–`}
                          {(d.up_to / 1e8).toLocaleString("en-US", { maximumFractionDigits: 2 })} ZEC
                        </>
                      ) : (
                        <>≥ {lo != null ? (lo / 1e8).toLocaleString("en-US", { maximumFractionDigits: 2 }) : "—"} ZEC</>
                      )}
                    </span>
                    <span className="h-3 rounded-sm bg-surface-2">
                      <span className="block h-full rounded-sm bg-link" style={{ width: `${(d.listings / depthMax) * 100}%` }} />
                    </span>
                    <span className="num text-right">{int(d.listings)}</span>
                  </li>
                );
              })}
            </ul>
            <p className="mt-3 text-xs text-muted">Listings by ask. Few listings just above the floor means the floor can move quickly.</p>
          </Card>
        </div>
      )}

      {s.book.deals.length > 0 && (
        <Card title="Listed below comparable sales" pad={false}>
          <p className="border-b border-border px-4 py-2 text-xs text-muted">
            Asks at least 10% under the median sale of the same rarity band over the last 7 days. A signal to look closer, not advice.
          </p>
          <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {s.book.deals.map((d) => (
              <Link key={d.item.id} href={`${base}/item/${d.item.id}`} className="card group block overflow-hidden hover:border-link">
                <div className="relative aspect-square border-b border-border bg-surface-2">
                  <NftImage src={`/v1/collections/${encodeURIComponent(slug)}/items/${d.item.id}/image`} fallback={d.item.name} />
                  <span className="num absolute right-1.5 top-1.5 rounded bg-good px-1.5 py-0.5 text-[10px] font-medium text-white">−{d.discount_pct.toFixed(0)}%</span>
                </div>
                <div className="px-3 py-2 text-[11px] text-muted">
                  <p className="num truncate text-sm font-medium text-link">{d.item.name}</p>
                  <p className="flex justify-between">
                    <Zec zat={d.item.ask} decimals={3} iconSize={10} className="text-text" />
                    <span>vs {(d.reference / 1e8).toFixed(3)}</span>
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </Card>
      )}

      {s.top_sales.length > 0 && (
        <Card title="Top sales" pad={false}>
          <ol className="divide-y divide-border">
            {s.top_sales.map((t, n) => (
              <li key={`${t.item}-${t.time}`} className="flex items-center gap-3 px-4 py-2.5 hover:bg-surface-2">
                <span className="num w-5 text-sm text-muted">{n + 1}</span>
                <span className="size-10 shrink-0 overflow-hidden rounded border border-border bg-surface-2">
                  <NftImage src={t.image} fallback="" />
                </span>
                <Link href={t.href} className="min-w-0 flex-1 truncate text-sm text-link hover:text-link-hover">
                  {t.name}
                </Link>
                <span className="shrink-0 text-right text-sm">
                  <span className="sm:hidden"><Zec zat={t.price} decimals={3} /></span>
                  <span className="hidden sm:inline"><Zec zat={t.price} decimals={3} showUsd /></span>
                  <span className="block text-[11px] text-muted">
                    <TimeAgo iso={t.time} />
                  </span>
                </span>
              </li>
            ))}
          </ol>
        </Card>
      )}
    </div>
  );
}

/** Every value of one trait type: rarity, floor and recent sales. */
export function TraitTable({ traits, types, type, typeHref, itemsHref }: { traits: TraitValue[]; types: string[]; type: string; typeHref: (t: string) => string; itemsHref: (key: string) => string }) {
  const rows = traits.filter((t) => t.trait_type === type).sort((a, b) => a.count - b.count);
  const total = rows.reduce((n, r) => n + r.count, 0) || 1;
  return (
    <Card
      title="Trait floors"
      pad={false}
      action={
        <div className="flex flex-wrap gap-1.5 text-xs">
          {types.map((t) => (
            <Link key={t} href={typeHref(t)} scroll={false} className={chip(t === type)}>
              {t}
            </Link>
          ))}
        </div>
      }
    >
      <div className="overflow-x-auto">
        <table className="w-full sm:min-w-[640px]">
          <thead className={tableHead}>
            <tr>
              <th className={th}>{type}</th>
              <th className={`${th} hidden text-right sm:table-cell`}>Items</th>
              <th className={`${th} text-right`}>Rarity</th>
              <th className={`${th} hidden text-right sm:table-cell`}>Listed</th>
              <th className={`${th} text-right`}>Floor</th>
              <th className={`${th} hidden text-right md:table-cell`}>Sales 7d</th>
              <th className={`${th} hidden text-right sm:table-cell`}>Median 7d</th>
              <th className={`${th} hidden sm:table-cell`} />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((r) => (
              <tr key={r.value} className="hover:bg-surface-2">
                <td className={`${td} whitespace-normal font-medium`}>
                  <Link href={itemsHref(`${type}:${r.value}`)} className="hover:text-link sm:pointer-events-none">
                    {r.value}
                  </Link>
                </td>
                <td className={`${td} num hidden text-right sm:table-cell`}>{int(r.count)}</td>
                <td className={`${td} num text-right text-muted`}>{((r.count / total) * 100).toFixed(2)}%</td>
                <td className={`${td} num hidden text-right sm:table-cell`}>{int(r.listed)}</td>
                <td className={`${td} text-right`}>{r.floor != null ? <Zec zat={r.floor} decimals={3} iconSize={11} /> : "—"}</td>
                <td className={`${td} num hidden text-right md:table-cell`}>{int(r.sales_7d)}</td>
                <td className={`${td} hidden text-right sm:table-cell`}>{r.median_7d != null ? <Zec zat={r.median_7d} decimals={3} iconSize={11} /> : "—"}</td>
                <td className={`${td} hidden text-right sm:table-cell`}>
                  <Link href={itemsHref(`${type}:${r.value}`)} className="text-xs text-link hover:text-link-hover">
                    Items ›
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

export { chip };

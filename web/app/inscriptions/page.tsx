import type { Metadata } from "next";
import Link from "next/link";
import { InscriptionGrid } from "@/components/Inscription";
import { Card, Empty, PageTitle, Stat } from "@/components/ui";
import { apiOrNull } from "@/lib/api";
import { IndexingStarting } from "@/app/loading-state";
import { int, pct } from "@/lib/format";
import type { InscriptionPage, InscriptionStats } from "@/lib/types";

export const metadata: Metadata = {
  title: "Zcash Inscriptions (Zerdinals)",
  description: "Every inscription on Zcash: images, text and ZRC-20 documents inscribed in transparent transactions, with owners and provenance.",
};

const FILTERS: [string | undefined, string][] = [
  [undefined, "All"],
  ["art", "Art"],
  ["image", "Images"],
  ["svg", "SVG"],
  ["html", "HTML"],
  ["text", "Text"],
  ["json", "JSON / ZRC-20"],
];

export default async function InscriptionsPage(props: PageProps<"/inscriptions">) {
  const sp = await props.searchParams;
  const media = typeof sp.media === "string" && FILTERS.some(([m]) => m === sp.media) ? sp.media : undefined;
  const order = sp.order === "asc" ? "asc" : "desc";
  const cursor = Number(sp.cursor) || undefined;
  const qs = new URLSearchParams({ limit: "48", order });
  if (media) qs.set("media", media);
  if (cursor) qs.set("cursor", String(cursor));

  const [stats, page] = await Promise.all([
    apiOrNull<InscriptionStats>("/v1/inscriptions/stats"),
    apiOrNull<InscriptionPage>(`/v1/inscriptions?${qs}`),
  ]);
  if (!stats || !page) return <IndexingStarting />;

  const count = (k: string) => stats.by_media.find((m) => m.key === k)?.count ?? 0;
  const shielded = stats.by_state.find((s) => s.key === "shielded")?.count ?? 0;
  const behind = stats.tip != null && stats.scan_height != null ? stats.tip - stats.scan_height : null;
  const link = (p: Record<string, string | undefined>) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries({ media, order: order === "asc" ? "asc" : undefined, ...p })) if (v) q.set(k, v);
    const s = q.toString();
    return s ? `/inscriptions?${s}` : "/inscriptions";
  };

  return (
    <div className="space-y-4">
      <PageTitle title="Inscriptions" eyebrow="Zerdinals">
        Content inscribed on Zcash since block {int(stats.first_height)}: the bytes live in the scriptSig of transparent
        transactions, and each inscription belongs to whoever holds the transparent output carrying it. Spent into a shielded
        transaction, an inscription leaves the public record for good.
      </PageTitle>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Inscriptions" value={int(stats.total)} sub={`${int(stats.holders)} current holders`} />
        <Stat label="Images & art" value={int(count("image") + count("svg") + count("html"))} sub={`${int(count("text"))} text`} />
        <Stat label="ZRC-20 documents" value={int(count("json"))} sub={<Link href="/tokens" className="text-link hover:text-link-hover">{int(stats.zrc20_tokens)} tokens deployed</Link>} />
        <Stat label="Shielded" value={int(shielded)} sub={`${pct(stats.total ? shielded / stats.total : 0)} of all inscriptions`} accent="var(--pool-ironwood)" />
      </div>

      {behind != null && behind > 100 && (
        <p className="rounded-md border border-warn/30 bg-warn/10 px-3 py-2 text-sm text-warn">
          Scanning history: {int(behind)} blocks to go. Counts and owners fill in as the scan reaches the tip.
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map(([m, label]) => (
            <Link
              key={label}
              href={link({ media: m, cursor: undefined })}
              className={`rounded-md border px-3 py-1 text-sm transition-colors ${
                media === m ? "border-link bg-link text-white" : "border-border bg-surface text-text hover:text-link"
              }`}
            >
              {label}
            </Link>
          ))}
        </div>
        <div className="flex gap-1.5 text-sm">
          <Link href={link({ order: undefined, cursor: undefined })} className={order === "desc" ? "font-medium" : "text-link hover:text-link-hover"}>
            Newest
          </Link>
          <span className="text-faint">·</span>
          <Link href={link({ order: "asc", cursor: undefined })} className={order === "asc" ? "font-medium" : "text-link hover:text-link-hover"}>
            Oldest
          </Link>
        </div>
      </div>

      {page.items.length ? <InscriptionGrid items={page.items} /> : <Card><Empty>No inscriptions match.</Empty></Card>}

      <div className="flex justify-end gap-2 text-sm">
        {cursor && (
          <Link href={link({ cursor: undefined })} className="rounded-md border border-border px-3 py-1 text-link hover:bg-surface-2">
            « First
          </Link>
        )}
        {page.next && (
          <Link href={link({ cursor: String(page.next) })} className="rounded-md border border-border px-3 py-1 text-link hover:bg-surface-2">
            {order === "asc" ? "Newer ›" : "Older ›"}
          </Link>
        )}
      </div>
    </div>
  );
}

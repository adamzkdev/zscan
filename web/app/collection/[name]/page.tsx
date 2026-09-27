import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Hash } from "@/components/Hash";
import { InscriptionGrid } from "@/components/Inscription";
import { TimeAgo } from "@/components/TimeAgo";
import { Card, Empty, PageTitle, Pill, Rows, Stat, tableHead, td, th } from "@/components/ui";
import { apiOrNull } from "@/lib/api";
import { int, utc } from "@/lib/format";
import type { CollectionDetail } from "@/lib/types";

export async function generateMetadata(props: PageProps<"/collection/[name]">): Promise<Metadata> {
  const { name } = await props.params;
  return { title: `${decodeURIComponent(name).toUpperCase()} (NFT collection)` };
}

export default async function CollectionPage(props: PageProps<"/collection/[name]">) {
  const { name } = await props.params;
  const sp = await props.searchParams;
  const cursor = Number(sp.cursor) || undefined;
  const c = await apiOrNull<CollectionDetail>(`/v1/collections/${encodeURIComponent(name)}${cursor ? `?cursor=${cursor}` : ""}`);
  if (!c) notFound();
  const base = `/collection/${encodeURIComponent(c.name)}`;

  return (
    <div className="space-y-4">
      <PageTitle
        title={
          <span className="flex flex-wrap items-center gap-2">
            {c.name} <Pill>ZRC-721</Pill>
            {!c.deployed && <Pill tone="warn">No deploy inscription</Pill>}
          </span>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Items" value={int(c.items)} sub={c.supply != null ? `of ${int(c.supply)} declared` : undefined} />
        <Stat label="Holders" value={int(c.holders)} />
        <Stat label="Shielded" value={int(c.shielded)} sub="tracking ended" accent="var(--pool-ironwood)" />
        <Stat label="First mint" value={<TimeAgo iso={c.first_time} />} sub={utc(c.first_time)} />
      </div>

      <Card title="Overview" pad={false}>
        <Rows
          rows={[
            c.deploy_inscription
              ? [
                  "Deploy inscription",
                  <Link key="d" href={`/inscription/${c.deploy_inscription}`} className="break-all font-mono text-xs text-link hover:text-link-hover">
                    {c.deploy_inscription}
                  </Link>,
                  "The first deploy of this name defines the collection.",
                ]
              : ["Deploy inscription", <span key="d" className="text-muted">None found: images can&apos;t be resolved</span>],
            c.deployer ? ["Deployer", <Hash key="a" value={c.deployer} href={`/address/${c.deployer}`} full />] : null,
            c.meta ? ["Metadata (IPFS)", <span key="m" className="break-all font-mono text-xs">{c.meta}</span>, "Folder holding <item>.json with each item’s name, image and traits."] : null,
          ]}
        />
      </Card>

      <Card title="Items" pad={false}>
        <div className="p-4">{c.items_page.length ? <InscriptionGrid items={c.items_page} /> : <Empty>No items.</Empty>}</div>
        {(cursor || c.next) && (
          <div className="flex justify-end gap-2 border-t border-border px-4 py-3 text-sm">
            {cursor && <Link href={base} className="rounded-md border border-border px-3 py-1 text-link hover:bg-surface-2">« First</Link>}
            {c.next && <Link href={`${base}?cursor=${c.next}`} className="rounded-md border border-border px-3 py-1 text-link hover:bg-surface-2">Next ›</Link>}
          </div>
        )}
      </Card>

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
                    <td className={`${td} num text-right`}>{((h.count / c.items) * 100).toFixed(2)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty>No transparent holders.</Empty>
        )}
      </Card>
    </div>
  );
}

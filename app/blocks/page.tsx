import type { Metadata } from "next";
import Link from "next/link";
import { BlocksTable } from "@/components/tables";
import { Card, PageTitle } from "@/components/ui";
import { api } from "@/lib/api";
import type { BlockSummary } from "@/lib/types";

export const metadata: Metadata = { title: "Blocks" };

export default async function BlocksPage(props: PageProps<"/blocks">) {
  const sp = await props.searchParams;
  const before = Number(sp.before) || undefined;
  const blocks = await api<BlockSummary[]>(`/v1/blocks?limit=50${before ? `&before=${before}` : ""}`);
  const last = blocks.at(-1);
  return (
    <div className="space-y-6">
      <PageTitle title="Blocks" />
      <Card
        pad={false}
        title={
          <span className="text-sm font-normal text-muted">
            {blocks.length ? `Block #${blocks.at(-1)!.height} to #${blocks[0].height}` : "No blocks"}
          </span>
        }
      >
        <BlocksTable blocks={blocks} />
        <div className="flex justify-end gap-2 border-t border-border px-4 py-3 text-sm">
          {before && (
            <Link href="/blocks" className="rounded-md border border-border px-3 py-1 text-link hover:bg-surface-2">
              First
            </Link>
          )}
          {last && (
            <Link href={`/blocks?before=${last.height}`} className="rounded-md border border-border px-3 py-1 text-link hover:bg-surface-2">
              Older ›
            </Link>
          )}
        </div>
      </Card>
    </div>
  );
}

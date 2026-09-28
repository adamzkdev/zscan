import type { Metadata } from "next";
import Link from "next/link";
import { TxTable } from "@/components/tables";
import { Card, PageTitle } from "@/components/ui";
import { api } from "@/lib/api";
import { KIND_LABEL } from "@/lib/kinds";
import type { TxKind, TxRow } from "@/lib/types";

export const metadata: Metadata = { title: "Transactions" };

const KINDS: TxKind[] = ["shielded", "migration", "shielding", "deshielding", "transparent", "mixed", "coinbase"];

export default async function TxsPage(props: PageProps<"/txs">) {
  const sp = await props.searchParams;
  const kind = KINDS.includes(sp.kind as TxKind) ? (sp.kind as TxKind) : undefined;
  const before = Number(sp.before) || undefined;
  const qs = new URLSearchParams({ limit: "50" });
  if (kind) qs.set("kind", kind);
  if (before) qs.set("before", String(before));
  const txs = await api<TxRow[]>(`/v1/txs?${qs}`);
  const last = txs.at(-1);
  const link = (k?: TxKind) => (k ? `/txs?kind=${k}` : "/txs");

  return (
    <div className="space-y-6">
      <PageTitle title="Transactions" />
      <div className="flex flex-wrap gap-1.5">
        {[undefined, ...KINDS].map((k) => (
          <Link
            key={k ?? "all"}
            href={link(k)}
            className={`rounded-md border px-3 py-1 text-sm transition-colors ${
              kind === k ? "border-link bg-link text-white" : "border-border bg-surface text-text hover:text-link"
            }`}
          >
            {k ? KIND_LABEL[k] : "All"}
          </Link>
        ))}
      </div>
      <Card pad={false}>
        <TxTable txs={txs} />
        {last && (
          <div className="flex justify-end border-t border-border px-4 py-3 text-sm">
            <Link
              href={`/txs?${new URLSearchParams({ ...(kind ? { kind } : {}), before: String(last.height) })}`}
              className="rounded-md border border-border px-3 py-1 text-link hover:bg-surface-2"
            >
              Older ›
            </Link>
          </div>
        )}
      </Card>
    </div>
  );
}

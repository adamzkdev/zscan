import type { Metadata } from "next";
import Link from "next/link";
import { PageTitle } from "@/components/ui";
import { TOOLS } from "@/lib/tools/list";

export const metadata: Metadata = {
  title: "Zcash Tools",
  description: "Free Zcash tools: transaction decoder, broadcast, address inspector, ZIP-321 payment requests, memos, ZIP-317 fees, units and network reference.",
};

export default function Tools() {
  return (
    <div className="space-y-4">
      <PageTitle title="Tools">Free tools for Zcash users and developers. They run on the open ZScan API.</PageTitle>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {TOOLS.map((t) => (
          <Link key={t.slug} href={`/tools/${t.slug}`} className="card block p-4 hover:border-border-strong">
            <p className="font-medium text-link">{t.title}</p>
            <p className="mt-1 text-sm text-muted">{t.blurb}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

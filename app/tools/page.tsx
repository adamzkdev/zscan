import type { Metadata } from "next";
import Link from "next/link";
import { PageTitle } from "@/components/ui";
import { TOOL_PAGES } from "@/lib/tools/list";

export const metadata: Metadata = {
  title: "Zcash Developer Tools",
  description: "Free Zcash tools: transaction decoder, broadcast, ZIP-317 fees, address inspector, ZIP-321 payment requests, memos, units and network reference.",
};

export default function Tools() {
  return (
    <div className="space-y-4">
      <PageTitle eyebrow="Developers" title="Developer Tools">
        Free tools for Zcash users and developers. They run on the open ZScan API.
      </PageTitle>
      <div className="grid gap-3 md:grid-cols-3">
        {TOOL_PAGES.map((p) => (
          <div key={p.slug} className="card p-4">
            <Link href={`/tools/${p.slug}`} className="font-medium text-link hover:text-link-hover">
              {p.title}
            </Link>
            <p className="mt-1 text-sm text-muted">{p.blurb}</p>
            <ul className="mt-3 space-y-1 text-sm">
              {p.tools.map((t) => (
                <li key={t.id}>
                  <Link href={`/tools/${p.slug}#${t.id}`} className="text-muted hover:text-text">
                    {t.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

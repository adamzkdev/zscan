import type { Metadata } from "next";
import Link from "next/link";
import { Sparkline } from "@/components/Sparkline";
import { Card, Empty, PageTitle, Pill, Stat, tableHead, td, th } from "@/components/ui";
import { apiOrNull } from "@/lib/api";
import { IndexingStarting } from "@/app/loading-state";
import { pct, signedZec, zec } from "@/lib/format";
import { CATEGORIES, categoryLabel } from "@/lib/protocols";
import type { ProtocolSummary } from "@/lib/types";

export const metadata: Metadata = {
  title: "Zcash Protocols: Where the ZEC Is",
  description: "Holdings and flows of shielded pools, treasuries, bridges, mining pools and exchanges on Zcash.",
};

function Change({ zat, base }: { zat: number | null; base: number | null }) {
  if (zat == null) return <span className="text-faint">—</span>;
  const rel = base ? zat / (base - zat) : null;
  const tone = zat > 0 ? "text-good" : zat < 0 ? "text-bad" : "text-muted";
  return (
    <span className={`num ${tone}`} title={`${signedZec(zat, 2)} ZEC`}>
      {rel != null && Number.isFinite(rel) ? `${rel >= 0 ? "+" : ""}${(rel * 100).toFixed(2)}%` : signedZec(zat, 2)}
    </span>
  );
}

function extra(p: ProtocolSummary) {
  const s = p.stats ?? {};
  if (typeof s.share_30d === "number") return `${pct(s.share_30d)} of blocks (30d)`;
  if (s.halted === true) return "Trading halted";
  return null;
}

export default async function ProtocolsPage(props: PageProps<"/protocols">) {
  const { category } = await props.searchParams;
  const all = await apiOrNull<ProtocolSummary[]>("/v1/protocols");
  if (!all) return <IndexingStarting />;
  const rows = typeof category === "string" ? all.filter((p) => p.category === category) : all;
  const sum = (cat: string) => all.filter((p) => p.category === cat).reduce((a, p) => a + (p.holdings ?? 0), 0);
  const tracked = all.reduce((a, p) => a + (p.holdings ?? 0), 0);

  return (
    <div className="space-y-4">
      <PageTitle title="Protocols">
        Where the ZEC is. Shielded pools and treasuries come straight from consensus; everything else from labeled
        addresses, each with a public source.
      </PageTitle>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="ZEC tracked" value={`${zec(tracked, 0)} ZEC`} />
        <Stat label="In shielded pools" value={`${zec(sum("shielded_pool"), 0)} ZEC`} accent="var(--ironwood-ink)" />
        <Stat label="In treasuries" value={`${zec(sum("treasury"), 0)} ZEC`} />
        <Stat label="In bridges" value={`${zec(sum("bridge"), 0)} ZEC`} />
      </div>

      <nav className="flex flex-wrap gap-2 text-sm" aria-label="Categories">
        <Tab href="/protocols" active={!category}>All</Tab>
        {CATEGORIES.map((c) => (
          <Tab key={c.key} href={`/protocols?category=${c.key}`} active={category === c.key}>
            {c.label}
            <span className="ml-1.5 text-faint">{all.filter((p) => p.category === c.key).length}</span>
          </Tab>
        ))}
      </nav>

      <Card pad={false}>
        {rows.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead className={tableHead}>
                <tr>
                  <th className={th}>#</th>
                  <th className={th}>Name</th>
                  <th className={th}>Category</th>
                  <th className={`${th} text-right`}>Holdings</th>
                  <th className={`${th} text-right`}>1d</th>
                  <th className={`${th} text-right`}>7d</th>
                  <th className={`${th} text-right`}>30d</th>
                  <th className={`${th} text-right`}>Inflow 7d</th>
                  <th className={`${th} text-right`}>Outflow 7d</th>
                  <th className={th}>30 days</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((p, i) => (
                  <tr key={p.slug} className="hover:bg-surface-2">
                    <td className={`${td} text-muted`}>{i + 1}</td>
                    <td className={td}>
                      <Link href={`/protocol/${p.slug}`} className="font-medium text-link hover:text-link-hover">
                        {p.name}
                      </Link>
                      {extra(p) && <span className="block text-xs text-muted">{extra(p)}</span>}
                    </td>
                    <td className={td}>
                      <Pill>{categoryLabel(p.category)}</Pill>
                    </td>
                    <td className={`${td} num text-right font-medium`}>{zec(p.holdings, 2)}</td>
                    <td className={`${td} text-right`}><Change zat={p.change_1d} base={p.holdings} /></td>
                    <td className={`${td} text-right`}><Change zat={p.change_7d} base={p.holdings} /></td>
                    <td className={`${td} text-right`}><Change zat={p.change_30d} base={p.holdings} /></td>
                    <td className={`${td} num text-right text-muted`}>{zec(p.inflow_7d, 2)}</td>
                    <td className={`${td} num text-right text-muted`}>{zec(p.outflow_7d, 2)}</td>
                    <td className={td}>
                      <Sparkline values={p.sparkline} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty>
            Nothing tracked in this category yet. Labels need a public source: propose one in{" "}
            <a href="https://github.com/adamzkdev/zscan-api/blob/main/labels/addresses.json" className="text-link">
              labels/addresses.json
            </a>
            .
          </Empty>
        )}
      </Card>
      <p className="text-xs text-muted">
        Amounts in ZEC. Changes and flows cover the indexed range. Data:{" "}
        <Link href="/v1/protocols" prefetch={false} className="text-link hover:text-link-hover">/v1/protocols</Link> ·{" "}
        <Link href="/labels" className="text-link hover:text-link-hover">all labels and sources</Link>
      </p>
    </div>
  );
}

function Tab({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={`rounded-lg px-3 py-1.5 ${active ? "bg-link font-medium text-white" : "bg-surface-2 text-text hover:text-link"}`}
    >
      {children}
    </Link>
  );
}

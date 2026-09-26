import type { Metadata } from "next";
import { MetricChart } from "@/components/charts/MetricChart";
import { PoolIcon } from "@/components/PoolIcon";
import { Card, PageTitle } from "@/components/ui";
import { apiOrNull } from "@/lib/api";
import { IndexingStarting } from "@/app/loading-state";
import { int } from "@/lib/format";
import type { Anonymity } from "@/lib/types";

export const metadata: Metadata = {
  title: "Zcash Anonymity Sets",
  description: "How many notes each Zcash shielded pool holds, and how fast each anonymity set grows.",
};

const POOLS = [
  { key: "ironwood", label: "Ironwood", color: "var(--pool-ironwood)" },
  { key: "orchard", label: "Orchard", color: "var(--pool-orchard)" },
  { key: "sapling", label: "Sapling", color: "var(--pool-sapling)" },
] as const;

export default async function AnonymityPage() {
  const a = await apiOrNull<Anonymity>("/v1/privacy/anonymity-sets");
  if (!a) return <IndexingStarting />;
  return (
    <div className="space-y-4">
      <PageTitle title="Anonymity Sets">
        A shielded transaction hides which note it spends among every note in its pool&apos;s commitment tree. More notes, and
        more new notes every day, mean stronger privacy for everyone using that pool.
      </PageTitle>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {POOLS.map((p) => (
          <div key={p.key} className="card p-5">
            <p className="flex items-center gap-2 text-sm font-medium">
              <PoolIcon pool={p.key} size={18} /> {p.label}
            </p>
            <p className="num mt-2 text-2xl font-semibold">{int(a[p.key])}</p>
            <p className="text-xs text-muted">notes in the commitment tree</p>
            <p className="num mt-3 text-sm">
              <span className={a[`${p.key}_24h`] > 0 ? "text-good" : "text-muted"}>+{int(a[`${p.key}_24h`])}</span>{" "}
              <span className="text-muted">new notes in 24h</span>
            </p>
          </div>
        ))}
      </div>
      <p className="text-sm text-muted">
        Orchard is sealed (withdraw-only since NU6.3), so its set only grows from change outputs of exits. New activity
        accrues to Ironwood.
      </p>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {POOLS.map((p) => (
          <Card key={p.key} title={`${p.label} notes over time`}>
            <MetricChart data={a.daily.map((d) => ({ day: d.day, value: d[p.key] ?? 0 }))} unit="int" color={p.color} />
          </Card>
        ))}
      </div>
    </div>
  );
}

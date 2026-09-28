"use client";

import { pct } from "@/lib/format";

// Categorical slots in fixed order (validated palette); the tail folds into "Other".
const COLORS = ["var(--pool-sapling)", "var(--pool-orchard)", "var(--pool-ironwood)", "var(--pool-transparent)", "var(--pool-sprout)"];

/** Share of blocks by miner as a stacked bar with a legend. Top 5 + Other. */
export function MinerShareChart({ items, total }: { items: { label: string; blocks: number }[]; total: number }) {
  const top = items.slice(0, 5);
  const other = total - top.reduce((s, i) => s + i.blocks, 0);
  const rows = [...top.map((t, i) => ({ ...t, color: COLORS[i] })), ...(other > 0 ? [{ label: "Other", blocks: other, color: "var(--faint)" }] : [])];
  return (
    <div>
      <div className="flex h-4 w-full gap-[2px] overflow-hidden rounded-full" role="img" aria-label="Share of blocks by miner">
        {rows.map((r) => (
          <div key={r.label} style={{ width: `${(r.blocks / total) * 100}%`, background: r.color }} title={`${r.label}: ${pct(r.blocks / total)}`} />
        ))}
      </div>
      <ul className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm sm:grid-cols-3">
        {rows.map((r) => (
          <li key={r.label} className="flex items-center gap-2">
            <span className="size-2.5 shrink-0 rounded-sm" style={{ background: r.color }} />
            <span className="truncate">{r.label}</span>
            <span className="num ml-auto text-muted">{pct(r.blocks / total)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

import { POOLS } from "@/lib/kinds";
import { pct, zecCompact } from "@/lib/format";
import type { PoolValues } from "@/lib/types";

/** Horizontal stacked bar of supply by pool, with a legend. */
export function PoolBar({ pools, compact = false }: { pools: PoolValues; compact?: boolean }) {
  const total = POOLS.reduce((s, p) => s + pools[p.key], 0);
  return (
    <div>
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-surface-2" role="img" aria-label="Supply by pool">
        {POOLS.map((p) => (
          <div
            key={p.key}
            style={{ width: `${(pools[p.key] / total) * 100}%`, background: p.color }}
            title={`${p.label}: ${zecCompact(pools[p.key])} ZEC`}
          />
        ))}
      </div>
      {!compact && (
        <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm sm:grid-cols-3 lg:grid-cols-5">
          {POOLS.map((p) => (
            <li key={p.key} className="flex items-center gap-2">
              <span className="size-2.5 shrink-0 rounded-sm" style={{ background: p.color }} />
              <span className="text-muted">{p.label}</span>
              <span className="num ml-auto font-medium">{zecCompact(pools[p.key])}</span>
              <span className="num w-12 text-right text-xs text-faint">{pct(pools[p.key] / total)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

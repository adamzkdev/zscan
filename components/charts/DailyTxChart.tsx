"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { int } from "@/lib/format";
import type { DailyStats } from "@/lib/types";
import { AXIS, dayLabel, GRID, Legend, Tip } from "./common";

// Same palette slots as the pools, assigned by the pool each kind touches.
const SERIES = [
  { key: "shielded", label: "Shielded", color: "var(--pool-ironwood)" },
  { key: "migration", label: "Migration", color: "var(--pool-orchard)" },
  { key: "shielding", label: "Shielding", color: "var(--pool-sapling)" },
  { key: "transparent", label: "Transparent", color: "var(--pool-transparent)" },
  { key: "deshielding", label: "Deshielding", color: "var(--pool-sprout)" },
] as const;

export function DailyTxChart({ data }: { data: DailyStats[] }) {
  return (
    <div>
      <div className="mb-3">
        <Legend items={SERIES.map((s) => ({ label: s.label, color: s.color }))} />
      </div>
      <div className="h-72">
        <ResponsiveContainer>
          <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid {...GRID} />
            <XAxis dataKey="day" tickFormatter={dayLabel} minTickGap={24} {...AXIS} />
            <YAxis width={48} {...AXIS} />
            <Tooltip
              cursor={{ fill: "var(--surface-2)" }}
              content={({ active, payload, label }) =>
                active && payload?.length ? (
                  <Tip
                    title={`${dayLabel(String(label))} · ${int(payload[0].payload.txs)} txs`}
                    rows={[...SERIES].reverse().map((s) => ({
                      label: s.label,
                      color: s.color,
                      value: int(payload[0].payload[s.key]),
                    }))}
                  />
                ) : null
              }
            />
            {SERIES.map((s, i) => (
              <Bar
                key={s.key}
                dataKey={s.key}
                stackId="k"
                fill={s.color}
                stroke="var(--surface)"
                strokeWidth={1}
                radius={i === SERIES.length - 1 ? [4, 4, 0, 0] : 0}
                maxBarSize={28}
                isAnimationActive={false}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

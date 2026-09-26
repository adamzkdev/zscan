"use client";

import { Bar, BarChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { signedZec, zecCompact } from "@/lib/format";
import type { Migration } from "@/lib/types";
import { AXIS, dayLabel, GRID, Legend, Tip } from "./common";

/** Daily net flows: Orchard outflow (negative) vs Ironwood net change. */
export function MigrationFlowChart({ daily }: { daily: Migration["daily"] }) {
  const data = daily.map((d) => ({ day: d.day, orchard: -d.orchard_out, ironwood: d.ironwood_in, txs: d.migration_txs }));
  return (
    <div>
      <div className="mb-3">
        <Legend
          items={[
            { label: "Orchard net change", color: "var(--pool-orchard)" },
            { label: "Ironwood net change", color: "var(--pool-ironwood)" },
          ]}
        />
      </div>
      <div className="h-64">
        <ResponsiveContainer>
          <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barGap={2}>
            <CartesianGrid {...GRID} />
            <XAxis dataKey="day" tickFormatter={dayLabel} minTickGap={24} {...AXIS} />
            <YAxis tickFormatter={(v) => zecCompact(v)} width={56} {...AXIS} />
            <ReferenceLine y={0} stroke="var(--border-strong)" />
            <Tooltip
              cursor={{ fill: "var(--surface-2)" }}
              content={({ active, payload, label }) =>
                active && payload?.length ? (
                  <Tip
                    title={dayLabel(String(label))}
                    rows={[
                      { label: "Orchard", color: "var(--pool-orchard)", value: `${signedZec(payload[0].payload.orchard, 2)} ZEC` },
                      { label: "Ironwood", color: "var(--pool-ironwood)", value: `${signedZec(payload[0].payload.ironwood, 2)} ZEC` },
                      { label: "Migration txs", color: "transparent", value: String(payload[0].payload.txs) },
                    ]}
                  />
                ) : null
              }
            />
            <Bar dataKey="orchard" fill="var(--pool-orchard)" radius={[4, 4, 4, 4]} maxBarSize={18} isAnimationActive={false} />
            <Bar dataKey="ironwood" fill="var(--pool-ironwood)" radius={[4, 4, 4, 4]} maxBarSize={18} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

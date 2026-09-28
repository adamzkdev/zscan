"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AXIS, dayLabel, GRID, Legend, Tip } from "./common";

type Series = { key: string; label: string; color: string };

/** Stacked daily bars for ZEC amounts (zatoshis in, ZEC on the axis). */
export function StackedDaily({ data, series }: { data: Record<string, number | string>[]; series: Series[] }) {
  const fmt = (v: number) => (v / 1e8).toLocaleString("en-US", { maximumFractionDigits: 2 });
  return (
    <div>
      <div className="mb-3">
        <Legend items={series.map((s) => ({ label: s.label, color: s.color }))} />
      </div>
      <div className="h-64">
        <ResponsiveContainer>
          <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid {...GRID} />
            <XAxis dataKey="day" tickFormatter={dayLabel} minTickGap={24} {...AXIS} />
            <YAxis tickFormatter={fmt} width={56} {...AXIS} />
            <Tooltip
              cursor={{ fill: "var(--surface-2)" }}
              content={({ active, payload, label }) =>
                active && payload?.length ? (
                  <Tip
                    title={dayLabel(String(label))}
                    rows={[...series].reverse().map((s) => ({ label: s.label, color: s.color, value: `${fmt(Number(payload[0].payload[s.key]))} ZEC` }))}
                  />
                ) : null
              }
            />
            {series.map((s, i) => (
              <Bar key={s.key} dataKey={s.key} stackId="s" fill={s.color} stroke="var(--surface)" strokeWidth={1} radius={i === series.length - 1 ? [4, 4, 0, 0] : 0} maxBarSize={28} isAnimationActive={false} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

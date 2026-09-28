"use client";

import { useId } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AXIS, dayLabel, GRID } from "./common";

const FORMATS = {
  int: (v: number) => v.toLocaleString("en-US"),
  pct: (v: number) => `${(v * 100).toFixed(0)}%`,
  zec: (v: number) => v.toFixed(v < 1 ? 3 : 2),
  kb: (v: number) => v.toFixed(1),
};

/** Single-series daily metric: the card title names it, so no legend. */
export function MetricChart({
  data,
  unit,
  color = "var(--link)",
}: {
  data: { day: string; value: number }[];
  unit: keyof typeof FORMATS;
  color?: string;
}) {
  const format = FORMATS[unit];
  const gid = useId().replace(/:/g, "");
  return (
    <div className="h-52">
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.25} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid {...GRID} />
          <XAxis dataKey="day" tickFormatter={dayLabel} minTickGap={28} {...AXIS} />
          <YAxis tickFormatter={unit === "int" ? (v: number) => v.toLocaleString("en-US", { notation: "compact", maximumFractionDigits: 1 }) : format} width={56} {...AXIS} />
          <Tooltip
            cursor={{ stroke: "var(--border-strong)" }}
            content={({ active, payload, label }) =>
              active && payload?.length ? (
                <div className="rounded-md border border-border bg-surface px-2.5 py-1.5 text-xs shadow">
                  <p className="text-muted">{dayLabel(String(label))}</p>
                  <p className="num font-medium">{format(payload[0].payload.value)}</p>
                </div>
              ) : null
            }
          />
          <Area type="monotone" dataKey="value" stroke={color} strokeWidth={2} fill={`url(#${gid})`} isAnimationActive={false} activeDot={{ r: 4, stroke: "var(--surface)", strokeWidth: 2 }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

"use client";

import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { usd } from "@/lib/format";

/** 14-day ZEC price line for the home stats card. Single series: no legend, the title names it. */
export function PriceSparkline({ history }: { history: [number, number][] }) {
  const data = history.map(([t, p]) => ({ t, p }));
  if (data.length < 2) return <p className="text-xs text-faint">No price history</p>;
  const label = (t: number) => new Date(t).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
  return (
    <div className="h-24">
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 6, right: 4, left: 4, bottom: 0 }}>
          <XAxis dataKey="t" tickFormatter={label} interval="preserveStartEnd" minTickGap={40} tick={{ fontSize: 10, fill: "var(--faint)" }} tickLine={false} axisLine={false} />
          <YAxis hide domain={["dataMin", "dataMax"]} />
          <Tooltip
            cursor={{ stroke: "var(--border-strong)" }}
            content={({ active, payload }) =>
              active && payload?.length ? (
                <div className="rounded-md border border-border bg-surface px-2 py-1 text-xs shadow">
                  <p className="text-muted">{label(payload[0].payload.t)}</p>
                  <p className="num font-medium">{usd(payload[0].payload.p)}</p>
                </div>
              ) : null
            }
          />
          <Line type="monotone" dataKey="p" stroke="var(--link)" strokeWidth={2} dot={false} activeDot={{ r: 4, stroke: "var(--surface)", strokeWidth: 2 }} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

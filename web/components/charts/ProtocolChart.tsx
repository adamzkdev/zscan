"use client";

import { useId, useState } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { zec, zecCompact } from "@/lib/format";
import type { ProtocolDay } from "@/lib/types";
import { AXIS, dayLabel, GRID, Legend, Tip } from "./common";

const COMPACT = (v: number) => zecCompact(v);

/** Holdings over time, or daily inflows vs outflows. */
export function ProtocolChart({ daily, flows = true }: { daily: ProtocolDay[]; flows?: boolean }) {
  const [view, setView] = useState<"holdings" | "flows">("holdings");
  const gid = useId().replace(/:/g, "");
  const data = daily.map((d) => ({ ...d, outflow: -d.outflow }));
  return (
    <div>
      {flows && (
        <div className="mb-3 inline-flex rounded-lg border border-border bg-surface-2 p-0.5 text-sm">
          {(["holdings", "flows"] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              className={`rounded-md px-3 py-1 capitalize ${view === v ? "bg-surface text-text shadow-sm" : "text-muted hover:text-text"}`}
            >
              {v === "holdings" ? "Holdings" : "Daily flows"}
            </button>
          ))}
        </div>
      )}
      <div className="h-64">
        <ResponsiveContainer>
          {view === "holdings" ? (
            <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--link)" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="var(--link)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid {...GRID} />
              <XAxis dataKey="day" tickFormatter={dayLabel} minTickGap={28} {...AXIS} />
              <YAxis tickFormatter={COMPACT} width={56} domain={["auto", "auto"]} {...AXIS} />
              <Tooltip
                cursor={{ stroke: "var(--border-strong)" }}
                content={({ active, payload, label }) =>
                  active && payload?.length ? (
                    <Tip
                      title={dayLabel(String(label))}
                      rows={[{ label: "Holdings", color: "var(--link)", value: `${zec(payload[0].payload.holdings, 2)} ZEC` }]}
                    />
                  ) : null
                }
              />
              <Area type="monotone" dataKey="holdings" stroke="var(--link)" strokeWidth={2} fill={`url(#${gid})`} isAnimationActive={false} />
            </AreaChart>
          ) : (
            <BarChart data={data} stackOffset="sign" margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid {...GRID} />
              <XAxis dataKey="day" tickFormatter={dayLabel} minTickGap={28} {...AXIS} />
              <YAxis tickFormatter={COMPACT} width={56} {...AXIS} />
              <Tooltip
                cursor={{ fill: "var(--surface-2)" }}
                content={({ active, payload, label }) =>
                  active && payload?.length ? (
                    <Tip
                      title={dayLabel(String(label))}
                      rows={[
                        { label: "Inflow", color: "var(--good)", value: `${zec(payload[0].payload.inflow, 2)} ZEC` },
                        { label: "Outflow", color: "var(--bad)", value: `${zec(-payload[0].payload.outflow, 2)} ZEC` },
                      ]}
                    />
                  ) : null
                }
              />
              <Bar dataKey="inflow" stackId="f" fill="var(--good)" radius={[2, 2, 0, 0]} isAnimationActive={false} />
              <Bar dataKey="outflow" stackId="f" fill="var(--bad)" radius={[0, 0, 2, 2]} isAnimationActive={false} />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
      {view === "flows" && (
        <div className="mt-2">
          <Legend items={[{ label: "Inflow", color: "var(--good)" }, { label: "Outflow", color: "var(--bad)" }]} />
        </div>
      )}
    </div>
  );
}

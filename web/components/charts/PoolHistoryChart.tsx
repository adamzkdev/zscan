"use client";

import { useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { zec, zecCompact } from "@/lib/format";
import { POOLS, type PoolKey } from "@/lib/kinds";
import type { PoolPoint } from "@/lib/types";
import { AXIS, dayLabel, GRID, hourLabel, Legend, Tip } from "./common";

type Mode = "shielded" | "all";

/** Stacked area of pool balances over time. Defaults to shielded pools, where the action is. */
export function PoolHistoryChart({ initial }: { initial: PoolPoint[] }) {
  const [interval, setInterval] = useState<"day" | "hour">("day");
  const [mode, setMode] = useState<Mode>("shielded");
  const [hourly, setHourly] = useState<PoolPoint[] | null>(null);
  const data = interval === "hour" && hourly ? hourly : initial;

  function changeInterval(next: "day" | "hour") {
    setInterval(next);
    if (next === "hour" && !hourly) {
      const since = new Date(Date.now() - 7 * 86400_000).toISOString();
      fetch(`/v1/pools/history?interval=hour&since=${since}`)
        .then((r) => r.json())
        .then(setHourly)
        .catch(() => {});
    }
  }

  const keys: PoolKey[] = mode === "shielded" ? ["ironwood", "orchard", "sapling", "sprout"] : POOLS.map((p) => p.key);
  const pools = POOLS.filter((p) => keys.includes(p.key));
  const fmtX = interval === "day" ? dayLabel : hourLabel;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Segmented
          value={mode}
          onChange={setMode}
          options={[
            ["shielded", "Shielded pools"],
            ["all", "All pools"],
          ]}
        />
        <Segmented
          value={interval}
          onChange={changeInterval}
          options={[
            ["day", "Daily"],
            ["hour", "Hourly · 7d"],
          ]}
        />
        <div className="ml-auto">
          <Legend items={pools.map((p) => ({ label: p.label, color: p.color }))} />
        </div>
      </div>
      <div className="h-80">
        <ResponsiveContainer>
          <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid {...GRID} />
            <XAxis dataKey="time" tickFormatter={fmtX} minTickGap={32} {...AXIS} />
            <YAxis tickFormatter={(v) => zecCompact(v)} width={56} {...AXIS} />
            <Tooltip
              cursor={{ stroke: "var(--border-strong)" }}
              content={({ active, payload, label }) =>
                active && payload?.length ? (
                  <Tip
                    title={`${fmtX(String(label))} · block ${(payload[0].payload as PoolPoint).height.toLocaleString()}`}
                    rows={[...pools].reverse().map((p) => ({
                      label: p.label,
                      color: p.color,
                      value: `${zec((payload[0].payload as PoolPoint)[p.key], 0)} ZEC`,
                    }))}
                  />
                ) : null
              }
            />
            {[...pools].reverse().map((p) => (
              <Area
                key={p.key}
                type="monotone"
                dataKey={p.key}
                stackId="1"
                stroke="var(--surface)"
                strokeWidth={2}
                fill={p.color}
                fillOpacity={0.9}
                isAnimationActive={false}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: [T, string][];
}) {
  return (
    <div className="inline-flex rounded-lg border border-border bg-surface-2 p-0.5 text-xs">
      {options.map(([v, l]) => (
        <button
          key={v}
          type="button"
          onClick={() => onChange(v)}
          className={`rounded-md px-2.5 py-1 transition-colors ${value === v ? "bg-border-strong text-text" : "text-muted hover:text-text"}`}
        >
          {l}
        </button>
      ))}
    </div>
  );
}

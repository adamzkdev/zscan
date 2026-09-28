"use client";

import { useState } from "react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { CollectionStats } from "@/lib/types";
import { AXIS, dayLabel, GRID, hourLabel, Legend, Tip } from "./common";

const zecFmt = (v: number) => v.toLocaleString("en-US", { maximumFractionDigits: v < 10 ? 3 : v < 1000 ? 1 : 0 });
const axisZec = (v: number) => v.toLocaleString("en-US", { notation: "compact", maximumFractionDigits: v < 10 ? 2 : 1 });

type View = "volume" | "sales" | "price" | "floor";

/** Daily volume, sales and prices of an NFT collection, plus hourly floor when snapshots exist. */
export function NftMarketChart({ history, floorSeries }: { history: CollectionStats["history"]; floorSeries: CollectionStats["floor_series"] }) {
  const floors = floorSeries.filter((p) => p.floor != null);
  const views: [View, string][] = [
    ["volume", "Volume"],
    ["sales", "Sales"],
    ["price", "Price"],
    ...(floors.length >= 2 ? ([["floor", "Floor (hourly)"]] as [View, string][]) : []),
  ];
  const [view, setView] = useState<View>("volume");
  const data = history.map((d) => ({
    day: d.day,
    volume: d.volume / 1e8,
    sales: d.sales,
    median: d.median != null ? d.median / 1e8 : null,
    floor: d.floor != null ? d.floor / 1e8 : null,
  }));
  const hasFloor = data.some((d) => d.floor != null);
  const hourly = floors.map((p) => ({ time: p.time, floor: (p.floor ?? 0) / 1e8, listings: p.listings }));

  return (
    <div>
      <div className="mb-3 inline-flex rounded-lg border border-border bg-surface-2 p-0.5 text-sm">
        {views.map(([v, label]) => (
          <button
            key={v}
            type="button"
            onClick={() => setView(v)}
            className={`rounded-md px-3 py-1 ${view === v ? "bg-surface text-text shadow-sm" : "text-muted hover:text-text"}`}
          >
            {label}
          </button>
        ))}
      </div>
      {view === "price" && (
        <div className="mb-2">
          <Legend items={[{ label: "Median sale", color: "var(--link)" }, ...(hasFloor ? [{ label: "Floor (end of day)", color: "var(--warn)" }] : [])]} />
        </div>
      )}
      <div className="h-64">
        <ResponsiveContainer>
          {view === "volume" || view === "sales" ? (
            <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid {...GRID} />
              <XAxis dataKey="day" tickFormatter={dayLabel} minTickGap={28} {...AXIS} />
              <YAxis tickFormatter={view === "volume" ? axisZec : (v: number) => v.toLocaleString("en-US")} width={48} {...AXIS} />
              <Tooltip
                cursor={{ fill: "var(--surface-2)" }}
                content={({ active, payload, label }) =>
                  active && payload?.length ? (
                    <Tip
                      title={dayLabel(String(label))}
                      rows={[
                        { label: "Volume", color: "var(--link)", value: `${zecFmt(payload[0].payload.volume)} ZEC` },
                        { label: "Sales", color: "var(--link)", value: payload[0].payload.sales.toLocaleString("en-US") },
                        ...(payload[0].payload.median != null ? [{ label: "Median", color: "var(--link)", value: `${zecFmt(payload[0].payload.median)} ZEC` }] : []),
                      ]}
                    />
                  ) : null
                }
              />
              <Bar dataKey={view} fill="var(--link)" radius={[4, 4, 0, 0]} maxBarSize={28} isAnimationActive={false} />
            </BarChart>
          ) : view === "price" ? (
            <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid {...GRID} />
              <XAxis dataKey="day" tickFormatter={dayLabel} minTickGap={28} {...AXIS} />
              <YAxis tickFormatter={axisZec} width={48} domain={["auto", "auto"]} {...AXIS} />
              <Tooltip
                cursor={{ stroke: "var(--border-strong)" }}
                content={({ active, payload, label }) =>
                  active && payload?.length ? (
                    <Tip
                      title={dayLabel(String(label))}
                      rows={[
                        { label: "Median sale", color: "var(--link)", value: payload[0].payload.median != null ? `${zecFmt(payload[0].payload.median)} ZEC` : "no sales" },
                        ...(hasFloor ? [{ label: "Floor", color: "var(--warn)", value: payload[0].payload.floor != null ? `${zecFmt(payload[0].payload.floor)} ZEC` : "—" }] : []),
                      ]}
                    />
                  ) : null
                }
              />
              <Line type="monotone" dataKey="median" stroke="var(--link)" strokeWidth={2} dot={false} connectNulls isAnimationActive={false} activeDot={{ r: 4, stroke: "var(--surface)", strokeWidth: 2 }} />
              {hasFloor && <Line type="stepAfter" dataKey="floor" stroke="var(--warn)" strokeWidth={2} dot={false} connectNulls isAnimationActive={false} />}
            </LineChart>
          ) : (
            <LineChart data={hourly} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid {...GRID} />
              <XAxis dataKey="time" tickFormatter={dayLabel} minTickGap={40} {...AXIS} />
              <YAxis tickFormatter={axisZec} width={48} domain={["auto", "auto"]} {...AXIS} />
              <Tooltip
                cursor={{ stroke: "var(--border-strong)" }}
                content={({ active, payload, label }) =>
                  active && payload?.length ? (
                    <Tip
                      title={`${hourLabel(String(label))} UTC`}
                      rows={[
                        { label: "Floor", color: "var(--link)", value: `${zecFmt(payload[0].payload.floor)} ZEC` },
                        ...(payload[0].payload.listings != null ? [{ label: "Listed", color: "var(--link)", value: payload[0].payload.listings.toLocaleString("en-US") }] : []),
                      ]}
                    />
                  ) : null
                }
              />
              <Line type="stepAfter" dataKey="floor" stroke="var(--link)" strokeWidth={2} dot={false} isAnimationActive={false} activeDot={{ r: 4, stroke: "var(--surface)", strokeWidth: 2 }} />
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/** Sale prices of one item over time. */
export function ItemSalesChart({ sales }: { sales: { time: string; price: number }[] }) {
  const data = sales.map((s) => ({ time: s.time, price: s.price / 1e8 }));
  return (
    <div className="h-48">
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid {...GRID} />
          <XAxis dataKey="time" tickFormatter={dayLabel} minTickGap={40} {...AXIS} />
          <YAxis tickFormatter={axisZec} width={48} domain={["auto", "auto"]} {...AXIS} />
          <Tooltip
            cursor={{ stroke: "var(--border-strong)" }}
            content={({ active, payload, label }) =>
              active && payload?.length ? (
                <Tip title={`${hourLabel(String(label))} UTC`} rows={[{ label: "Sale", color: "var(--link)", value: `${zecFmt(payload[0].payload.price)} ZEC` }]} />
              ) : null
            }
          />
          <Line type="linear" dataKey="price" stroke="var(--link)" strokeWidth={2} dot={{ r: 4, fill: "var(--link)", stroke: "var(--surface)", strokeWidth: 2 }} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

"use client";

import type { ReactNode } from "react";

export const AXIS = { stroke: "var(--faint)", fontSize: 11, tickLine: false, axisLine: false } as const;
export const GRID = { stroke: "var(--border)", strokeDasharray: "0", vertical: false } as const;

export function Tip({ title, rows }: { title: ReactNode; rows: { label: string; color: string; value: string }[] }) {
  return (
    <div className="min-w-48 rounded-lg border border-border-strong bg-surface-2/95 px-3 py-2 text-xs shadow-xl backdrop-blur">
      <p className="mb-1.5 font-medium text-text">{title}</p>
      <ul className="space-y-1">
        {rows.map((r) => (
          <li key={r.label} className="flex items-center gap-2">
            <span className="size-2 rounded-sm" style={{ background: r.color }} />
            <span className="text-muted">{r.label}</span>
            <span className="num ml-auto pl-3 text-text">{r.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Legend({ items }: { items: { label: string; color: string }[] }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
      {items.map((i) => (
        <li key={i.label} className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm" style={{ background: i.color }} />
          {i.label}
        </li>
      ))}
    </ul>
  );
}

export const dayLabel = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
export const hourLabel = (iso: string) =>
  new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", timeZone: "UTC", hour12: false });

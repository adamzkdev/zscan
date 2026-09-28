"use client";

import { useSyncExternalStore } from "react";

const subscribe = (cb: () => void) => {
  const t = setInterval(cb, 100);
  return () => clearInterval(t);
};
const now = () => Math.floor(Date.now() / 100) * 100;

/**
 * Supply ticking up in real time between blocks: the last known supply plus the expected
 * issuance since the snapshot (subsidy / average block time). Re-anchored on every block.
 */
export function LiveSupply({ supply, snapshotAt, zatPerSecond }: { supply: number; snapshotAt: string; zatPerSecond: number }) {
  const t = useSyncExternalStore(subscribe, now, () => null);
  const elapsed = t == null ? 0 : Math.max(0, (t - new Date(snapshotAt).getTime()) / 1000);
  // Cap the projection at ~one block so a stalled feed never drifts far.
  const value = (supply + Math.min(elapsed, 90) * zatPerSecond) / 1e8;
  return (
    <span className="num tabular-nums">
      {value.toLocaleString("en-US", { minimumFractionDigits: 4, maximumFractionDigits: 4 })}
    </span>
  );
}

export function Countdown({ target }: { target: string }) {
  const t = useSyncExternalStore(subscribe, now, () => null);
  if (t == null) return <span className="num">—</span>;
  const s = Math.max(0, Math.floor((new Date(target).getTime() - t) / 1000));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  return (
    <span className="num">
      {d}d {h}h {m}m {s % 60}s
    </span>
  );
}

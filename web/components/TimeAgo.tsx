"use client";

import { useSyncExternalStore } from "react";
import { ago, utc } from "@/lib/format";

const TICK = 5000;
const subscribe = (cb: () => void) => {
  const t = setInterval(cb, TICK);
  return () => clearInterval(t);
};
// Rounded so the snapshot is stable between renders within a tick.
const now = () => Math.floor(Date.now() / TICK) * TICK;

/** Relative time that stays fresh; renders absolute UTC on the server to avoid hydration drift. */
export function TimeAgo({ iso }: { iso: string }) {
  const t = useSyncExternalStore(subscribe, now, () => null);
  return (
    <time dateTime={iso} title={utc(iso)} className="whitespace-nowrap">
      {t == null ? utc(iso) : ago(iso, t)}
    </time>
  );
}

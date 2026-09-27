/** A decimal-string amount with thousands separators (amounts can exceed Number precision). */
export function Amount({ v }: { v: string }) {
  const [w, f] = v.split(".");
  const whole = /^\d+$/.test(w) ? BigInt(w).toLocaleString("en-US") : w;
  return (
    <>
      {whole}
      {f && <span className="text-muted">.{f}</span>}
    </>
  );
}

export function Progress({ value }: { value: number }) {
  const p = Math.min(100, Math.max(0, value));
  return (
    <span className="flex items-center gap-2">
      <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2">
        <span className="block h-full rounded-full" style={{ width: `${p}%`, background: p >= 100 ? "var(--good)" : "var(--link)" }} />
      </span>
      <span className="num w-14 text-right text-xs text-muted">{p >= 99.995 ? "100%" : `${p.toFixed(2)}%`}</span>
    </span>
  );
}

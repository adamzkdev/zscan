export const ZAT = 100_000_000;

/** Formats zatoshis as ZEC, trimming trailing zeros. */
export function zec(zat: number | null | undefined, maxDecimals = 8): string {
  if (zat == null) return "—";
  const v = zat / ZAT;
  return v.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxDecimals,
  });
}

/** Compact ZEC for headline numbers: 3.99M, 427.1K. */
export function zecCompact(zat: number | null | undefined): string {
  if (zat == null) return "—";
  const v = zat / ZAT;
  return v.toLocaleString("en-US", { notation: "compact", maximumFractionDigits: 2 });
}

export function signedZec(zat: number, maxDecimals = 8): string {
  const s = zec(Math.abs(zat), maxDecimals);
  return zat > 0 ? `+${s}` : zat < 0 ? `−${s}` : s;
}

export function int(n: number | null | undefined): string {
  return n == null ? "—" : n.toLocaleString("en-US");
}

export function pct(r: number | null | undefined, digits = 1): string {
  return r == null ? "—" : `${(r * 100).toFixed(digits)}%`;
}

export function bytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

export function short(hash: string, head = 8, tail = 6): string {
  if (hash.length <= head + tail + 1) return hash;
  return tail > 0 ? `${hash.slice(0, head)}…${hash.slice(-tail)}` : `${hash.slice(0, head)}…`;
}

export function hashrate(solps: number | null | undefined): string {
  if (solps == null) return "—";
  const units = ["Sol/s", "KSol/s", "MSol/s", "GSol/s", "TSol/s"];
  let v = solps;
  let i = 0;
  while (v >= 1000 && i < units.length - 1) {
    v /= 1000;
    i++;
  }
  return `${v.toFixed(2)} ${units[i]}`;
}

export function utc(iso: string): string {
  return new Date(iso).toISOString().replace("T", " ").replace(/\.\d+Z$/, " UTC");
}

export function ago(iso: string, now = Date.now()): string {
  const s = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h}h ${m % 60}m ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function usd(v: number, compact = false): string {
  return v.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    notation: compact ? "compact" : "standard",
    maximumFractionDigits: compact ? 2 : v < 1 ? 4 : 2,
  });
}

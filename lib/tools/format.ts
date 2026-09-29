export const ZAT = 100_000_000;

/** Zatoshis as ZEC, all significant decimals. */
export function zec(zat: number | bigint): string {
  const n = BigInt(zat);
  const neg = n < BigInt(0);
  const a = neg ? -n : n;
  const whole = a / BigInt(ZAT);
  const frac = (a % BigInt(ZAT)).toString().padStart(8, "0").replace(/0+$/, "");
  return `${neg ? "-" : ""}${whole.toLocaleString("en-US")}${frac ? `.${frac}` : ""}`;
}

export const int = (n: number) => n.toLocaleString("en-US");

export function usd(v: number): string {
  return v.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: v < 1 ? 4 : 2 });
}

export function short(s: string, head = 10, tail = 8): string {
  return s.length <= head + tail + 1 ? s : `${s.slice(0, head)}…${tail ? s.slice(-tail) : ""}`;
}

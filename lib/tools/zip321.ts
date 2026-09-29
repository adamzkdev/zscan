/**
 * ZIP-321 payment requests: `zcash:<address>?amount=…&memo=…` for one payment, or indexed
 * parameters (`address.1`, `amount.1`, …) for several.
 */
import { fromBase64Url, readMemo, toBase64Url, utf8 } from "./memo";

export interface Payment {
  address: string;
  amount: string;
  memo: string;
  label: string;
  message: string;
}

export const emptyPayment = (): Payment => ({ address: "", amount: "", memo: "", label: "", message: "" });

/** Shielded addresses (and UAs with a shielded receiver) carry memos; transparent ones don't. */
export const memoCapable = (a: string) => /^(zs1|u1|ztestsapling1|utest1)/.test(a.trim());

/** ZIP-321 amounts: decimal ZEC, at most 8 decimals, no exponent. */
export function validAmount(a: string): boolean {
  return /^\d{1,8}(\.\d{1,8})?$/.test(a.trim()) && Number(a) <= 21_000_000;
}

// qchar allows unreserved characters plus a few sub-delims; everything else is percent-encoded.
const enc = (s: string) => encodeURIComponent(s).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);

export function buildUri(payments: Payment[]): string {
  const ps = payments.filter((p) => p.address.trim());
  if (ps.length === 0) return "";
  const params: string[] = [];
  let head = "";
  ps.forEach((p, i) => {
    const sfx = i === 0 ? "" : `.${i}`;
    if (ps.length === 1) head = p.address.trim();
    else params.push(`address${sfx}=${p.address.trim()}`);
    if (p.amount.trim()) params.push(`amount${sfx}=${p.amount.trim()}`);
    if (p.memo && memoCapable(p.address)) params.push(`memo${sfx}=${toBase64Url(utf8(p.memo))}`);
    if (p.label.trim()) params.push(`label${sfx}=${enc(p.label.trim())}`);
    if (p.message.trim()) params.push(`message${sfx}=${enc(p.message.trim())}`);
  });
  return `zcash:${head}${params.length ? `?${params.join("&")}` : ""}`;
}

export interface ParsedPayment {
  index: number;
  address: string;
  amount?: string;
  memoText?: string;
  memoRaw?: string;
  label?: string;
  message?: string;
  other: Record<string, string>;
}

export function parseUri(uri: string): { payments: ParsedPayment[]; errors: string[] } {
  const errors: string[] = [];
  const s = uri.trim();
  if (!/^zcash:/i.test(s)) return { payments: [], errors: ["A payment request starts with zcash:"] };
  const [path, query = ""] = s.slice(6).split("?", 2);
  const byIndex = new Map<number, ParsedPayment>();
  const get = (i: number) => {
    if (!byIndex.has(i)) byIndex.set(i, { index: i, address: "", other: {} });
    return byIndex.get(i)!;
  };
  if (path) get(0).address = decodeURIComponent(path);
  for (const pair of query.split("&").filter(Boolean)) {
    const [k, v = ""] = pair.split("=", 2);
    const m = k.match(/^([a-z-]+)(?:\.(\d+))?$/i);
    if (!m) {
      errors.push(`Unreadable parameter "${k}"`);
      continue;
    }
    const [, name, idx] = m;
    const p = get(idx ? Number(idx) : 0);
    const value = decodeURIComponent(v);
    if (name === "address") {
      if (p.address) errors.push(`Payment ${p.index} has two addresses`);
      p.address = value;
    } else if (name === "amount") {
      if (!validAmount(value)) errors.push(`Payment ${p.index}: invalid amount "${value}"`);
      p.amount = value;
    } else if (name === "memo") {
      const bytes = fromBase64Url(value);
      if (!bytes) errors.push(`Payment ${p.index}: memo is not base64url`);
      else {
        p.memoRaw = value;
        const r = readMemo(bytes);
        p.memoText = r.kind === "text" ? r.text : r.kind === "empty" ? "(empty memo)" : "(binary memo)";
        if (bytes.length > 512) errors.push(`Payment ${p.index}: memo exceeds 512 bytes`);
      }
      if (!memoCapable(p.address)) errors.push(`Payment ${p.index}: memos can't be sent to a transparent address`);
    } else if (name === "label") p.label = value;
    else if (name === "message") p.message = value;
    else if (name.startsWith("req-")) errors.push(`Payment ${p.index}: required parameter "${name}" is not supported by wallets that follow ZIP-321`);
    else p.other[name] = value;
  }
  const payments = [...byIndex.values()].sort((a, b) => a.index - b.index);
  payments.filter((p) => !p.address).forEach((p) => errors.push(`Payment ${p.index} has no address`));
  return { payments, errors };
}

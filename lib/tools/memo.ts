/** Zcash memos (ZIP-302): 512 bytes. Text memos are UTF-8, zero-padded; 0xF6 marks "no memo". */
export const MEMO_BYTES = 512;

export const utf8 = (s: string) => new TextEncoder().encode(s);

export const toHex = (b: Uint8Array) => Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");

export function fromHex(h: string): Uint8Array | null {
  const s = h.replace(/\s+/g, "").replace(/^0x/i, "");
  if (s.length % 2 || /[^0-9a-f]/i.test(s)) return null;
  return new Uint8Array(s.match(/../g)?.map((b) => parseInt(b, 16)) ?? []);
}

/** base64url without padding, as ZIP-321 carries memos. */
export function toBase64Url(b: Uint8Array): string {
  let bin = "";
  b.forEach((x) => (bin += String.fromCharCode(x)));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function fromBase64Url(s: string): Uint8Array | null {
  try {
    const b64 = s.trim().replace(/-/g, "+").replace(/_/g, "/");
    const bin = atob(b64 + "=".repeat((4 - (b64.length % 4)) % 4));
    return Uint8Array.from(bin, (c) => c.charCodeAt(0));
  } catch {
    return null;
  }
}

/** Reads memo bytes the way wallets do: text, empty, or arbitrary data. */
export function readMemo(b: Uint8Array): { kind: "text" | "empty" | "binary"; text?: string } {
  if (b.length === 0 || (b[0] === 0xf6 && b.slice(1).every((x) => x === 0))) return { kind: "empty" };
  if (b[0] <= 0xf4) {
    let end = b.length;
    while (end > 0 && b[end - 1] === 0) end--;
    try {
      return { kind: "text", text: new TextDecoder("utf-8", { fatal: true }).decode(b.slice(0, end)) };
    } catch {
      return { kind: "binary" };
    }
  }
  return { kind: "binary" };
}

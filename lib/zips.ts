import "server-only";

/// Zcash Improvement Proposals, read from github.com/zcash/zips (the source of zips.z.cash). Only the
/// preamble of each file is parsed (`ZIP:`, `Title:`, `Status:` …), which reads the same in .rst and .md.

const REPO = "zcash/zips";
const DAY = 86_400;

export type Zip = {
  /// File name without extension: `zip-0317`, `draft-arya-deploy-nu7`. Also the zips.z.cash path.
  slug: string;
  /// ZIP number, null for drafts that have none yet.
  number: number | null;
  title: string;
  /// First status in the preamble, e.g. `Final` for "[Revision 0: Canopy, Revision 1: NU6] Final, …".
  status: string;
  /// The full status when revisions differ, for a tooltip.
  statusDetail: string | null;
  categories: string[];
  owners: string[];
  created: string | null;
  url: string;
};

export const STATUS_ORDER = ["Draft", "Proposed", "Active", "Final", "Obsolete", "Withdrawn", "Rejected", "Reserved"];

export const statusTone = (s: string): "neutral" | "good" | "warn" | "bad" | "info" =>
  s === "Final" || s === "Active" ? "good" : s === "Proposed" ? "info" : s === "Draft" ? "warn" : s === "Withdrawn" || s === "Rejected" ? "bad" : "neutral";

/// ZIPs that ZScan tracks live on chain: the page where you can watch them at work.
export const LIVE: Record<number, { href: string; label: string }> = {
  207: { href: "/treasury", label: "Treasury" },
  209: { href: "/supply", label: "Supply audit" },
  214: { href: "/treasury", label: "Treasury" },
  218: { href: "/upgrades", label: "NU7 countdown" },
  233: { href: "/supply", label: "Supply & burn" },
  234: { href: "/supply", label: "Supply & burn" },
  235: { href: "/supply", label: "Supply & burn" },
  258: { href: "/ironwood", label: "Ironwood tracker" },
  259: { href: "/upgrades", label: "NU7 countdown" },
  271: { href: "/treasury", label: "Treasury" },
  316: { href: "/developers", label: "UA inspector API" },
  317: { href: "/fees", label: "Fee tracker" },
  318: { href: "/ironwood", label: "Ironwood tracker" },
  1014: { href: "/treasury", label: "Treasury" },
  1015: { href: "/treasury", label: "Treasury" },
  1016: { href: "/treasury", label: "Treasury" },
  2001: { href: "/treasury", label: "Treasury" },
  2003: { href: "/upgrades", label: "NU7 countdown" },
  2005: { href: "/ironwood", label: "Ironwood tracker" },
};

export const zipUrl = (n: number) => `https://zips.z.cash/zip-${String(n).padStart(4, "0")}`;

/// Parses the `Key: value` preamble; indented lines without a key continue the previous value.
export function parsePreamble(text: string): Record<string, string[]> {
  const lines = text.split("\n");
  const start = lines.findIndex((l) => /^\s*ZIP:/.test(l));
  const out: Record<string, string[]> = {};
  if (start < 0) return out;
  let key: string | null = null;
  for (const line of lines.slice(start)) {
    if (!line.trim()) break;
    const m = /^\s*([A-Za-z][\w-]*):\s*(.*)$/.exec(line);
    if (m) {
      key = m[1];
      out[key] = m[2] ? [m[2].trim()] : [];
    } else if (key) {
      out[key].push(line.trim());
    }
  }
  return out;
}

function toZip(slug: string, text: string): Zip | null {
  const p = parsePreamble(text);
  const title = p.Title?.join(" ");
  // Templates and guides (`{Something Short and To the Point}`) are not proposals.
  if (!title || title.startsWith("{")) return null;
  const rawStatus = p.Status?.join(" ") ?? "Unknown";
  const status = /(?:^|\]\s*)([A-Z][a-z]+)/.exec(rawStatus)?.[1] ?? rawStatus;
  const number = /^zip-(\d+)$/.exec(slug)?.[1];
  const categories = (p.Category?.join(" ") ?? "")
    .split("/")
    .map((c) => c.trim().replace(/^Consensus Process$/, "Process").replace(/^Standards Track$/, "Standards"))
    .filter(Boolean);
  return {
    slug,
    number: number ? Number(number) : null,
    title,
    status,
    statusDetail: rawStatus.includes("[") ? rawStatus : null,
    categories,
    owners: (p.Owners ?? []).map((o) => o.replace(/<[^>]*>/g, "").trim()).filter(Boolean),
    created: p.Created?.[0] ?? null,
    url: `https://zips.z.cash/${slug}`,
  };
}

async function fetchText(url: string, init?: RequestInit): Promise<string> {
  const res = await fetch(url, { ...init, next: { revalidate: DAY }, signal: AbortSignal.timeout(15_000) });
  if (!res.ok) throw new Error(`${url} answered ${res.status}`);
  return res.text();
}

async function load(): Promise<Zip[]> {
  const listing = JSON.parse(
    await fetchText(`https://api.github.com/repos/${REPO}/contents/zips`, {
      headers: { Accept: "application/vnd.github+json", "User-Agent": "zscan" },
    }),
  ) as { name: string }[];
  const files = listing.map((f) => f.name).filter((n) => /^(zip|draft)-.*\.(md|rst)$/.test(n));
  const zips: Zip[] = [];
  // Raw files are not rate limited like the API; 16 at a time keeps the daily refresh quick.
  for (let i = 0; i < files.length; i += 16) {
    const batch = await Promise.all(
      files.slice(i, i + 16).map(async (name) => {
        const text = await fetchText(`https://raw.githubusercontent.com/${REPO}/main/zips/${name}`).catch(() => "");
        return toZip(name.replace(/\.(md|rst)$/, ""), text);
      }),
    );
    for (const z of batch) if (z) zips.push(z);
  }
  return zips.sort((a, b) => (a.number ?? Infinity) - (b.number ?? Infinity) || a.slug.localeCompare(b.slug));
}

let cache: { at: number; zips: Promise<Zip[]> } | null = null;

/// Every ZIP, refreshed once a day. A failed refresh keeps serving the previous list.
export async function getZips(): Promise<Zip[]> {
  const now = Date.now() / 1000;
  if (!cache || now - cache.at > DAY) {
    const previous = cache;
    const next = load();
    cache = { at: now, zips: next };
    next.catch(() => {
      cache = previous;
    });
  }
  return cache.zips;
}

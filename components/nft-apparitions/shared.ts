import type { PurgedItem } from "@/lib/types";

export const median = (xs: number[]) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

/** Trait types a viewer can colour by. */
export const TRAIT_TYPES = ["Lineage", "Skin", "Eyes", "Head"];

/** Values with their own colour; the rest fold into "Other". */
const NAMED = 6;

export const traitOf = (p: PurgedItem, type: string) => p.traits.find((t) => t.trait_type === type)?.value ?? "—";

/** The most common values of a trait among all purged snarks, in colour order. */
export function namedValues(all: PurgedItem[], type: string): string[] {
  const m = new Map<string, number>();
  for (const p of all) m.set(traitOf(p, type), (m.get(traitOf(p, type)) ?? 0) + 1);
  const totals = [...m].sort((a, b) => b[1] - a[1]);
  return totals.slice(0, totals.length > NAMED + 1 ? NAMED : NAMED + 1).map(([v]) => v);
}

/** `value` as one of the named values or "Other". */
export const fold = (named: string[], value: string) => (named.includes(value) ? value : "Other");

/** Categorical slots 1–6 (light and dark steps, validated in this order) and a neutral "Other".
 *  Put `viz-traits` on the chart's root. */
export const TRAIT_STYLE = `
  .viz-traits { --dna-1:#2a78d6; --dna-2:#eb6834; --dna-3:#1baf7a; --dna-4:#eda100; --dna-5:#e87ba4; --dna-6:#008300; --dna-7:#6250d6; --dna-other:#a3a29b; }
  @media (prefers-color-scheme: dark) { :root:where(:not([data-theme="light"])) .viz-traits { --dna-1:#3987e5; --dna-2:#d95926; --dna-3:#199e70; --dna-4:#c98500; --dna-5:#d55181; --dna-6:#008300; --dna-7:#9085e9; --dna-other:#5f5e59; } }
  :root[data-theme="dark"] .viz-traits { --dna-1:#3987e5; --dna-2:#d95926; --dna-3:#199e70; --dna-4:#c98500; --dna-5:#d55181; --dna-6:#008300; --dna-7:#9085e9; --dna-other:#5f5e59; }
`;

export const traitColor = (named: string[], v: string) => (v === "Other" ? "var(--dna-other)" : `var(--dna-${named.indexOf(v) + 1})`);

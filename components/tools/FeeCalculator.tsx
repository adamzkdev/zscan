"use client";

import { useState } from "react";
import { zec } from "@/lib/tools/format";
import { Field, Panel, Rows } from "./ui";

const MARGINAL_FEE = 5_000;
const GRACE_ACTIONS = 2;

const FIELDS = [
  ["tIn", "Transparent inputs"],
  ["tOut", "Transparent outputs"],
  ["sSpend", "Sapling spends"],
  ["sOut", "Sapling outputs"],
  ["orchard", "Orchard actions"],
  ["ironwood", "Ironwood actions"],
] as const;
type Key = (typeof FIELDS)[number][0];

/** ZIP-317: fee = 5,000 zat × max(2, logical actions). */
export function FeeCalculator() {
  const [v, setV] = useState<Record<Key, number>>({ tIn: 0, tOut: 0, sSpend: 0, sOut: 0, orchard: 2, ironwood: 0 });
  const transparent = Math.max(v.tIn, v.tOut);
  const sapling = Math.max(v.sSpend, v.sOut);
  const actions = transparent + sapling + v.orchard + v.ironwood;
  const fee = MARGINAL_FEE * Math.max(GRACE_ACTIONS, actions);

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
      <Panel title="Transaction shape">
        <div className="grid gap-3 sm:grid-cols-2">
          {FIELDS.map(([k, label]) => (
            <Field key={k} label={label}>
              <input
                className="input num"
                type="number"
                min={0}
                max={10000}
                value={v[k]}
                onChange={(e) => setV((s) => ({ ...s, [k]: Math.max(0, Math.floor(Number(e.target.value) || 0)) }))}
              />
            </Field>
          ))}
        </div>
        <p className="mt-3 text-xs text-faint">
          Orchard and Ironwood actions each hold one spend and one output, and are padded to at least 2 per bundle by wallets. Transparent inputs and outputs are counted for standard P2PKH sizes (150 and 34 bytes).
        </p>
      </Panel>
      <Panel title="Conventional fee">
        <p className="num text-3xl font-semibold">{zec(fee)} ZEC</p>
        <p className="num text-muted">{fee.toLocaleString("en-US")} zatoshis</p>
        <div className="mt-4">
          <Rows
            rows={[
              ["Transparent", `max(${v.tIn}, ${v.tOut}) = ${transparent}`],
              ["Sapling", `max(${v.sSpend}, ${v.sOut}) = ${sapling}`],
              ["Orchard + Ironwood", `${v.orchard + v.ironwood}`],
              ["Logical actions", `${actions}`],
              ["Fee", `5,000 × max(2, ${actions})`],
            ]}
          />
        </div>
        <p className="mt-3 text-xs text-faint">Paying less than this fee makes nodes and miners likely to drop the transaction (ZIP-317). Paying more doesn&apos;t make it faster.</p>
      </Panel>
    </div>
  );
}

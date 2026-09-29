"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/tools/api";
import { int } from "@/lib/tools/format";
import { Field } from "./ui";

type Block = { height: number; time: string };

/** Past heights: the block's own time. Future heights: projected from the tip at the target
 * spacing (75 s; NU7 moves to 25 s once its height is set). */
export function HeightDate({ spacing }: { spacing: number }) {
  const [tip, setTip] = useState<Block | null>(null);
  const [h, setH] = useState("");
  // Lookups keyed by height, so a result never shows for another input.
  const [lookup, setLookup] = useState<{ height: number; block?: Block; error?: string } | null>(null);
  const height = Number(h);
  const valid = h.trim() !== "" && Number.isInteger(height) && height >= 0;

  useEffect(() => {
    apiFetch<Block[]>("/v1/blocks?limit=1")
      .then((b) => setTip(b[0] ?? null))
      .catch(() => setTip(null));
  }, []);

  useEffect(() => {
    if (!valid || !tip || height > tip.height) return;
    const ctl = new AbortController();
    const t = setTimeout(() => {
      apiFetch<Block>(`/v1/blocks/${height}`, { signal: ctl.signal })
        .then((block) => setLookup({ height, block }))
        .catch((e) => !ctl.signal.aborted && setLookup({ height, error: (e as Error).message }));
    }, 300);
    return () => {
      clearTimeout(t);
      ctl.abort();
    };
  }, [h, tip, valid, height]);

  const current = lookup && valid && lookup.height === height ? lookup : null;
  const past = current?.block ?? null;
  const error = current?.error ?? null;
  const future = valid && tip && height > tip.height ? new Date(new Date(tip.time).getTime() + (height - tip.height) * spacing * 1000) : null;

  return (
    <div className="space-y-3">
      <Field label="Block height" hint={tip ? `tip ${int(tip.height)}` : undefined}>
        <input className="input num" inputMode="numeric" value={h} onChange={(e) => setH(e.target.value.replace(/[^\d]/g, ""))} placeholder={tip ? String(tip.height + 1000) : "3500000"} />
      </Field>
      {past && (
        <p>
          Mined{" "}
          <a href={`/block/${past.height}`} className="text-link hover:text-link-hover">
            {new Date(past.time).toUTCString()}
          </a>
        </p>
      )}
      {future && tip && (
        <p>
          Expected around <span className="font-medium">{future.toUTCString()}</span>{" "}
          <span className="text-muted">
            ({int(height - tip.height)} blocks × {spacing} s from the tip; blocks vary, so treat it as ± a few hours past a week out)
          </span>
        </p>
      )}
      {error && <p className="text-bad">{error}</p>}
    </div>
  );
}

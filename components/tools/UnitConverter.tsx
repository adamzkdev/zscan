"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/tools/api";
import { usd } from "@/lib/tools/format";
import { Field, Panel } from "./ui";

type Unit = "zec" | "zat" | "usd";

function fromZec(z: number, unit: Unit, price: number | null): string {
  if (!Number.isFinite(z)) return "";
  if (unit === "zat") return Math.round(z * 1e8).toString();
  if (unit === "usd") return price == null ? "" : (z * price).toFixed(2);
  return Number(z.toFixed(8)).toString();
}

export function UnitConverter() {
  const [price, setPrice] = useState<number | null>(null);
  const [zec, setZec] = useState(1);
  const [edit, setEdit] = useState<{ unit: Unit; text: string } | null>(null);

  useEffect(() => {
    apiFetch<{ usd: number }>("/v1/price")
      .then((p) => setPrice(p.usd))
      .catch(() => setPrice(null));
  }, []);

  const value = (u: Unit) => (edit?.unit === u ? edit.text : fromZec(zec, u, price));
  const onChange = (u: Unit, text: string) => {
    setEdit({ unit: u, text });
    const n = Number(text.replace(/,/g, ""));
    if (text.trim() === "" || !Number.isFinite(n)) return;
    setZec(u === "zat" ? n / 1e8 : u === "usd" ? (price ? n / price : zec) : n);
  };

  return (
    <Panel>
      <div className="grid gap-3 sm:grid-cols-3">
        {(
          [
            ["zec", "ZEC"],
            ["zat", "Zatoshis (1 ZEC = 100,000,000)"],
            ["usd", "USD"],
          ] as const
        ).map(([u, label]) => (
          <Field key={u} label={label}>
            <input className="input num" inputMode="decimal" value={value(u)} onChange={(e) => onChange(u, e.target.value)} onBlur={() => setEdit(null)} disabled={u === "usd" && price == null} />
          </Field>
        ))}
      </div>
      <p className="mt-3 text-xs text-faint">{price != null ? `1 ZEC = ${usd(price)} (ZScan price feed)` : "Loading the ZEC price…"}</p>
    </Panel>
  );
}

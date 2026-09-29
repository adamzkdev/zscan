"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/tools/api";
import type { AddressInfo } from "@/lib/tools/types";
import { ErrorBox, Panel, Rows, Tag } from "./ui";

const KINDS: Record<string, string> = {
  transparent_p2pkh: "Transparent (P2PKH)",
  transparent_p2sh: "Transparent (P2SH, multisig or script)",
  tex: "TEX (ZIP-320: transparent source only)",
  sapling: "Sapling (shielded)",
  sprout: "Sprout (legacy shielded, can no longer receive)",
  unified: "Unified Address",
};
const POOLS: Record<string, string> = { transparent: "Transparent", sapling: "Sapling", orchard: "Orchard / Ironwood" };

export function AddressInspector() {
  const [addr, setAddr] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<AddressInfo | null>(null);

  async function run() {
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      setInfo(await apiFetch<AddressInfo>(`/v1/decode/address/${encodeURIComponent(addr.trim())}`));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const transparent = info && ["transparent_p2pkh", "transparent_p2sh", "tex"].includes(info.kind);
  return (
    <div className="space-y-4">
      <form
        className="panel flex flex-col gap-2 p-4 sm:flex-row"
        onSubmit={(e) => {
          e.preventDefault();
          if (addr.trim()) run();
        }}
      >
        <input className="input font-mono" value={addr} onChange={(e) => setAddr(e.target.value)} placeholder="t1…, t3…, tex1…, zs1…, u1… (mainnet or testnet)" spellCheck={false} />
        <button className="btn justify-center" disabled={!addr.trim() || busy}>
          {busy ? "Inspecting…" : "Inspect"}
        </button>
      </form>
      {error && <ErrorBox>{error}</ErrorBox>}
      {info && (
        <>
          <Panel
            title={<span className="flex items-center gap-2">Valid address <Tag tone="good">{info.network}</Tag></span>}
            action={
              transparent && info.network === "mainnet" ? (
                <a href={`/address/${info.p2pkh_equivalent ?? info.address}`} className="text-sm text-link hover:text-link-hover">
                  Balance and history →
                </a>
              ) : undefined
            }
          >
            <Rows
              rows={[
                ["Address", <span key="a" className="font-mono">{info.address}</span>, info.address],
                ["Type", KINDS[info.kind] ?? info.kind],
                ["Can receive in", info.pools.length ? <span key="p" className="flex flex-wrap gap-1">{info.pools.map((p) => <Tag key={p} tone={p === "transparent" ? "neutral" : "good"}>{POOLS[p] ?? p}</Tag>)}</span> : "Nothing (legacy)"],
                ["Memos", info.can_receive_memo ? "Yes (512 bytes, encrypted)" : "No: transparent payments carry no memo"],
                ["Privacy", info.transparent_only ? "Public: amounts and history are visible on-chain" : "Shielded: amounts, sender and memo are encrypted"],
                info.raw && [info.kind === "sapling" || info.kind === "sprout" ? "Payment address bytes" : "Key or script hash", <span key="r" className="font-mono text-xs">{info.raw}</span>, info.raw],
                info.p2pkh_equivalent && ["Pays on-chain as", <span key="e" className="font-mono">{info.p2pkh_equivalent}</span>, info.p2pkh_equivalent],
              ]}
            />
          </Panel>
          {info.receivers && (
            <Panel title={`Receivers (${info.receivers.length})`}>
              <p className="mb-3 text-muted">A wallet paying this address uses the most private receiver it supports. Orchard receivers also receive Ironwood notes.</p>
              <ul className="space-y-3">
                {info.receivers.map((r, k) => (
                  <li key={k} className="rounded-lg border border-border p-3">
                    <p className="flex items-center gap-2 font-medium">
                      {r.pools}
                      <span className="font-mono text-xs text-faint">{r.kind}</span>
                    </p>
                    {r.address && (
                      <a href={`/address/${r.address}`} className="mt-1 block break-all font-mono text-xs text-link hover:text-link-hover">
                        {r.address}
                      </a>
                    )}
                    <p className="mt-1 break-all font-mono text-xs text-muted">{r.raw}</p>
                  </li>
                ))}
              </ul>
            </Panel>
          )}
        </>
      )}
    </div>
  );
}

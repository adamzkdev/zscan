"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/tools/api";
import type { BroadcastResponse, DecodedTx } from "@/lib/tools/types";
import { ErrorBox, Field, Panel } from "./ui";
import { DecodedView } from "./DecodedView";
import { cleanHex, decodeTx } from "./TxDecoder";

/** Decode first, then broadcast: the user sees what they are about to send. */
export function Broadcast() {
  const [hex, setHex] = useState("");
  const [busy, setBusy] = useState<"check" | "send" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [checked, setChecked] = useState<{ hex: string; d: DecodedTx } | null>(null);
  const [sent, setSent] = useState<BroadcastResponse | null>(null);
  const h = cleanHex(hex);

  async function check() {
    setBusy("check");
    setError(null);
    setSent(null);
    setChecked(null);
    try {
      setChecked({ hex: h, d: await decodeTx(h) });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function send() {
    if (!checked) return;
    setBusy("send");
    setError(null);
    try {
      setSent(await apiFetch<BroadcastResponse>("/v1/tx/broadcast", { method: "POST", body: JSON.stringify({ hex: checked.hex }) }));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  const ready = checked && checked.hex === h && !checked.d.mined_height;

  return (
    <div className="space-y-4">
      <div className="panel space-y-3 p-4">
        <Field label="Signed raw transaction (hex)">
          <textarea className="input h-40" value={hex} onChange={(e) => setHex(e.target.value)} placeholder="0500008085202f89…" spellCheck={false} />
        </Field>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-ghost" disabled={!h || !!busy} onClick={check}>
            {busy === "check" ? "Checking…" : "1. Check"}
          </button>
          <button type="button" className="btn" disabled={!ready || !!busy || !!sent?.txid} onClick={send}>
            {busy === "send" ? "Broadcasting…" : "2. Broadcast"}
          </button>
        </div>
        <p className="text-xs text-faint">Broadcasting is final: the transaction goes to Zcash mainnet nodes through the ZScan API. Only signed transactions are accepted.</p>
      </div>
      {error && <ErrorBox>{error}</ErrorBox>}
      {sent &&
        (sent.txid ? (
          <Panel title="Broadcast">
            <p>
              Accepted by the network.{" "}
              <a href={`/tx/${sent.txid}`} className="text-link hover:text-link-hover">
                Follow it in the explorer →
              </a>
            </p>
          </Panel>
        ) : (
          <ErrorBox>
            Rejected ({sent.error_code}): {sent.error_message || "no reason given"}
          </ErrorBox>
        ))}
      {checked?.d.mined_height && <ErrorBox>This transaction is already mined; there is nothing to broadcast.</ErrorBox>}
      {checked && <DecodedView d={checked.d} />}
    </div>
  );
}

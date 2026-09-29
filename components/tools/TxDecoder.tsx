"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/tools/api";
import type { DecodedTx } from "@/lib/tools/types";
import { ErrorBox, Field } from "./ui";
import { DecodedView } from "./DecodedView";

export const cleanHex = (s: string) => s.replace(/\s+/g, "").replace(/^0x/i, "");

export function decodeTx(hex: string) {
  return apiFetch<DecodedTx>("/v1/decode/tx", { method: "POST", body: JSON.stringify({ hex }) });
}

export function TxDecoder() {
  const [hex, setHex] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DecodedTx | null>(null);
  const h = cleanHex(hex);
  const isTxid = /^[0-9a-f]{64}$/i.test(h);

  async function run() {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      setResult(await decodeTx(h));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <form
        className="panel space-y-3 p-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (h && !isTxid) run();
        }}
      >
        <Field label="Raw transaction (hex)" hint={h ? `${(h.length / 2).toLocaleString("en-US")} bytes` : undefined}>
          <textarea className="input h-40" value={hex} onChange={(e) => setHex(e.target.value)} placeholder="0500008085202f89…" spellCheck={false} />
        </Field>
        {isTxid && (
          <p className="text-muted">
            That looks like a transaction ID, not a raw transaction.{" "}
            <a href={`/tx/${h.toLowerCase()}`} className="text-link hover:text-link-hover">
              Open it in the explorer →
            </a>
          </p>
        )}
        <button className="btn" disabled={!h || isTxid || busy}>
          {busy ? "Decoding…" : "Decode"}
        </button>
      </form>
      {error && <ErrorBox>{error}</ErrorBox>}
      {result && <DecodedView d={result} />}
    </div>
  );
}

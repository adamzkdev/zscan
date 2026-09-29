"use client";

import QRCode from "qrcode";
import { useEffect, useMemo, useState } from "react";
import { MEMO_BYTES, utf8 } from "@/lib/tools/memo";
import { buildUri, emptyPayment, memoCapable, parseUri, validAmount, type Payment } from "@/lib/tools/zip321";
import { CopyButton } from "./CopyButton";
import { ErrorBox, Field, Panel, Rows } from "./ui";

function Builder() {
  const [payments, setPayments] = useState<Payment[]>([emptyPayment()]);
  const uri = useMemo(() => buildUri(payments), [payments]);
  // The QR code of the current URI (a stale one is ignored while the new one renders).
  const [qrFor, setQrFor] = useState<{ uri: string; data: string } | null>(null);
  const qr = qrFor && qrFor.uri === uri ? qrFor.data : null;

  useEffect(() => {
    if (!uri) return;
    let live = true;
    QRCode.toDataURL(uri, { margin: 1, width: 320, errorCorrectionLevel: "M" })
      .then((data) => live && setQrFor({ uri, data }))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [uri]);

  const set = (i: number, patch: Partial<Payment>) => setPayments((ps) => ps.map((p, k) => (k === i ? { ...p, ...patch } : p)));

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
      <div className="space-y-4">
        {payments.map((p, i) => {
          const memoLen = utf8(p.memo).length;
          return (
            <Panel
              key={i}
              title={payments.length > 1 ? `Payment ${i + 1}` : "Payment"}
              action={
                payments.length > 1 ? (
                  <button type="button" className="text-sm text-muted hover:text-bad" onClick={() => setPayments((ps) => ps.filter((_, k) => k !== i))}>
                    Remove
                  </button>
                ) : undefined
              }
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Field label="Address">
                    <input className="input font-mono" value={p.address} onChange={(e) => set(i, { address: e.target.value })} placeholder="u1…, zs1… or t1…" spellCheck={false} />
                  </Field>
                </div>
                <Field label="Amount (ZEC)" hint={p.amount && !validAmount(p.amount) ? <span className="text-bad">up to 8 decimals</span> : "optional"}>
                  <input className="input num" value={p.amount} onChange={(e) => set(i, { amount: e.target.value })} placeholder="0.5" inputMode="decimal" />
                </Field>
                <Field label="Label" hint="optional">
                  <input className="input" value={p.label} onChange={(e) => set(i, { label: e.target.value })} placeholder="Shop name" />
                </Field>
                <div className="sm:col-span-2">
                  <Field
                    label="Memo"
                    hint={
                      p.address && !memoCapable(p.address) ? (
                        <span className="text-accent">transparent addresses can&apos;t receive memos</span>
                      ) : (
                        <span className={memoLen > MEMO_BYTES ? "text-bad" : ""}>
                          {memoLen}/{MEMO_BYTES} bytes
                        </span>
                      )
                    }
                  >
                    <textarea className="input h-20 !font-sans !text-sm" value={p.memo} onChange={(e) => set(i, { memo: e.target.value })} placeholder="Order #1234" disabled={!!p.address && !memoCapable(p.address)} />
                  </Field>
                </div>
                <div className="sm:col-span-2">
                  <Field label="Message" hint="optional, shown to the payer">
                    <input className="input" value={p.message} onChange={(e) => set(i, { message: e.target.value })} placeholder="Thanks for your order" />
                  </Field>
                </div>
              </div>
            </Panel>
          );
        })}
        <button type="button" className="btn-ghost" onClick={() => setPayments((ps) => [...ps, emptyPayment()])}>
          + Add a payment
        </button>
      </div>
      <div className="lg:sticky lg:top-20 lg:self-start">
        <Panel title="Payment request">
          {uri ? (
            <div className="space-y-3">
              {qr && (
                // eslint-disable-next-line @next/next/no-img-element -- generated data URL
                <img src={qr} alt="QR code of the payment request" width={320} height={320} className="mx-auto w-full max-w-[320px] rounded-lg bg-white p-2" />
              )}
              <p className="break-all rounded-lg border border-border bg-bg p-2.5 font-mono text-xs text-muted">{uri}</p>
              <div className="flex flex-wrap gap-2">
                <CopyButton text={uri} label="Copy URI" />
                {qr && (
                  <a href={qr} download="zcash-payment.png" className="inline-flex items-center rounded-md border border-border bg-surface-2 px-1.5 py-1 text-xs text-muted hover:text-text">
                    Download QR
                  </a>
                )}
              </div>
            </div>
          ) : (
            <p className="text-muted">Enter an address to build the request.</p>
          )}
        </Panel>
      </div>
    </div>
  );
}

function Parser() {
  const [uri, setUri] = useState("");
  const parsed = useMemo(() => (uri.trim() ? parseUri(uri) : null), [uri]);
  return (
    <div className="space-y-4">
      <Field label="zcash: URI">
        <textarea className="input h-24" value={uri} onChange={(e) => setUri(e.target.value)} placeholder="zcash:u1…?amount=1.5&memo=…" spellCheck={false} />
      </Field>
      {parsed?.errors.map((e) => <ErrorBox key={e}>{e}</ErrorBox>)}
      {parsed?.payments.map((p) => (
        <Panel key={p.index} title={`Payment ${p.index + 1}`}>
          <Rows
            rows={[
              ["Address", <span key="a" className="font-mono">{p.address || "—"}</span>, p.address],
              ["Amount", p.amount ? `${p.amount} ZEC` : "Not set (the payer chooses)"],
              p.memoText !== undefined && ["Memo", p.memoText, p.memoText],
              p.label && ["Label", p.label],
              p.message && ["Message", p.message],
              ...Object.entries(p.other).map(([k, v]) => [k, v] as [string, string]),
            ]}
          />
        </Panel>
      ))}
    </div>
  );
}

export function PaymentUri() {
  const [tab, setTab] = useState<"build" | "parse">("build");
  return (
    <div className="space-y-4">
      <div className="seg" role="tablist">
        <button role="tab" aria-selected={tab === "build"} onClick={() => setTab("build")}>
          Build
        </button>
        <button role="tab" aria-selected={tab === "parse"} onClick={() => setTab("parse")}>
          Parse
        </button>
      </div>
      {tab === "build" ? <Builder /> : <Parser />}
    </div>
  );
}

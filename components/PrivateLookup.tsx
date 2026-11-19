"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import type { PrivateAddressResult, PrivateTxResult } from "@/lib/pir";
import { bytes, int, utc } from "@/lib/format";
import type { Mempool } from "@/lib/types";
import { TimeAgo } from "./TimeAgo";
import { Card, Pill, Rows, Zec } from "./ui";

/*
 * Private lookups (PIR). The looked-up value lives only in this module's memory: never in a URL,
 * storage, or any request to ZScan (the PIR client sends an encrypted query; the mempool check
 * downloads the whole pending list and searches it here).
 */

export type PrivateQuery = { kind: "tx" | "address"; value: string };

/** A transaction hash or a transparent address (mainnet t1/t3, testnet tm/t2); nothing else. */
export function classifyPrivate(q: string): PrivateQuery | null {
  const v = q.trim();
  if (/^[0-9a-f]{64}$/i.test(v)) return { kind: "tx", value: v.toLowerCase() };
  if (/^t[13m2][1-9A-HJ-NP-Za-km-z]{33}$/.test(v)) return { kind: "address", value: v };
  return null;
}

/* ------------------------------------------------------------------ availability */

let available: Promise<boolean> | null = null;
const pir = () => import("@/lib/pir");

/** Whether private lookup works here: null while checking. Checked once per page load. */
export function usePirAvailable() {
  const [ok, setOk] = useState<boolean | null>(null);
  useEffect(() => {
    let live = true;
    available ??= pir()
      .then((m) => m.pirAvailable())
      .catch(() => false);
    available.then((v) => live && setOk(v));
    return () => {
      live = false;
    };
  }, []);
  return ok;
}

/* ------------------------------------------------------------------ lookup state (memory only) */

type Mempooled = { seenAt: string } | { full: boolean } | { error: true };
type Outcome =
  | { status: "running"; q: PrivateQuery }
  | { status: "error"; q: PrivateQuery; message: string }
  | { status: "done"; q: PrivateQuery; tx?: PrivateTxResult; address?: PrivateAddressResult; mempool?: Mempooled };

let outcome: Outcome | null = null;
const listeners = new Set<() => void>();
const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};
function setOutcome(o: Outcome | null) {
  outcome = o;
  listeners.forEach((l) => l());
}

/** Looks for the txid in the full mempool list, here in the browser. */
async function inMempool(txid: string): Promise<Mempooled> {
  try {
    const m: Mempool = await fetch("/v1/mempool").then((r) => {
      if (!r.ok) throw new Error();
      return r.json();
    });
    const hit = m.txs.find((t) => t.txid === txid);
    // The API lists at most the 500 newest pending transactions.
    return hit ? { seenAt: hit.seen_at } : { full: m.txs.length >= 500 };
  } catch {
    return { error: true };
  }
}

async function run(q: PrivateQuery) {
  setOutcome({ status: "running", q });
  try {
    const m = await pir();
    if (q.kind === "tx") {
      const tx = await m.privateTx(q.value);
      const mempool = tx.found ? undefined : await inMempool(q.value);
      if (outcome?.q === q) setOutcome({ status: "done", q, tx, mempool });
    } else {
      const address = await m.privateAddress(q.value);
      if (outcome?.q === q) setOutcome({ status: "done", q, address });
    }
  } catch (e) {
    if (outcome?.q === q) setOutcome({ status: "error", q, message: e instanceof Error ? e.message : String(e) });
  }
}

/** Called by the search bar, which then shows /private: the lookup runs from memory, wherever it starts. */
export function startPrivateLookup(q: PrivateQuery) {
  void run(q);
}

/* ------------------------------------------------------------------ page */

export function PrivateLookup({ tip }: { tip: number | null }) {
  const ok = usePirAvailable();
  const o = useSyncExternalStore(subscribe, () => outcome, () => null);
  const [q, setQ] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const p = classifyPrivate(q);
    if (!p) return setError("Enter a transaction hash or a transparent address (t1…, t3…).");
    setError(null);
    setQ("");
    run(p);
  };

  return (
    <div className="space-y-4">
      <form onSubmit={submit} className="card flex flex-col gap-2 p-3 sm:flex-row sm:items-center" title={ok === false ? "Private lookup (PIR) is unavailable" : undefined}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Transaction hash or transparent address"
          aria-label="Value to look up privately"
          spellCheck={false}
          autoComplete="off"
          disabled={!ok}
          className="input font-mono text-sm disabled:opacity-60"
        />
        <button type="submit" className="btn shrink-0 justify-center" disabled={!ok || o?.status === "running"}>
          <LockIcon /> Look up privately
        </button>
      </form>
      {error && <p className="text-sm text-bad">{error}</p>}
      {ok === false && !o && <p className="text-sm text-muted">Private lookup is unavailable right now.</p>}
      {o && <Result o={o} tip={tip} onClear={() => setOutcome(null)} />}
    </div>
  );
}

function Result({ o, tip, onClear }: { o: Outcome; tip: number | null; onClear: () => void }) {
  const what = o.q.kind === "tx" ? "transaction" : "address";
  const snap = o.status === "done" ? (o.tx ?? o.address)!.snapshotHeight : null;
  const behind = snap != null && tip != null ? Math.max(0, tip - snap) : null;
  return (
    <Card
      pad={false}
      title={
        <span className="flex flex-wrap items-center gap-2">
          Private lookup <Pill tone="info"><LockIcon size={11} /> PIR</Pill>
        </span>
      }
      action={
        <button type="button" onClick={onClear} className="text-xs text-muted hover:text-link">
          Clear
        </button>
      }
      footer={
        o.status === "done" ? (
          <p className="text-left text-xs text-muted">
            ZScan&apos;s server computed this answer over its whole database from an encrypted query: it did not learn which {what} you
            asked about, only that a private lookup was made, when, and from which IP address.
          </p>
        ) : undefined
      }
    >
      <Rows
        rows={[
          [o.q.kind === "tx" ? "Transaction Hash" : "Address", <span key="v" className={`break-all font-mono ${o.q.kind === "address" ? "addr" : ""}`}>{o.q.value}</span>],
          o.status === "running" ? ["Status", <span key="s" className="text-muted">Looking up…</span>] : null,
          o.status === "error" ? ["Status", <span key="s" className="text-bad">Lookup failed: {o.message}</span>] : null,
          ...(o.status === "done" && o.tx ? txRows(o.tx, o.mempool) : []),
          ...(o.status === "done" && o.address ? addressRows(o.address) : []),
          snap != null
            ? [
                "Snapshot",
                <span key="sn">
                  Block {int(snap)}
                  {tip != null && (
                    <span className="text-muted">
                      {" "}
                      · chain tip {int(tip)}
                      {behind ? ` (${int(behind)} block${behind === 1 ? "" : "s"} newer, not covered)` : " (up to date)"}
                    </span>
                  )}
                </span>,
                "The private database is a copy of the chain at this height.",
              ]
            : null,
        ]}
      />
    </Card>
  );
}

/** Unix seconds (or milliseconds) → ISO. */
const iso = (t: number) => new Date(t < 1e12 ? t * 1000 : t).toISOString();

function txRows(t: PrivateTxResult, m?: Mempooled): ([React.ReactNode, React.ReactNode] | null)[] {
  if (!t.found) {
    const pool =
      m == null ? null : "seenAt" in m ? (
        <span key="m">
          <Pill tone="warn">Pending</Pill> In the mempool, seen <TimeAgo iso={m.seenAt} />
        </span>
      ) : "error" in m ? (
        <span key="m" className="text-muted">Could not load the mempool list.</span>
      ) : (
        <span key="m" className="text-muted">Not in the mempool{m.full ? " (checked the 500 newest pending transactions)" : ""}.</span>
      );
    return [
      ["Status", <span key="s">Not found in the snapshot</span>],
      pool && ["Mempool", <span key="mp" className="flex flex-col gap-0.5">{pool}<span className="text-xs text-faint">Checked in your browser against the full pending list.</span></span>],
    ];
  }
  return [
    ["Status", <Pill key="s" tone="good">✓ Mined</Pill>],
    ["Block", t.height != null ? int(t.height) : "—"],
    t.index != null ? ["Position in Block", `#${int(t.index)}`] : null,
    t.time != null ? ["Timestamp", <span key="t"><TimeAgo iso={iso(t.time)} /> <span className="text-muted">({utc(iso(t.time))})</span></span>] : null,
    ["Transaction Fee", <Zec key="f" zat={t.fee} showUsd />],
    t.size != null ? ["Size", bytes(t.size)] : null,
  ];
}

function addressRows(a: PrivateAddressResult): ([React.ReactNode, React.ReactNode] | null)[] {
  if (!a.found) {
    // the server may hold funded addresses only: then "not found" also means "empty"
    return a.scope === "nonzero-balance"
      ? [["Status", <span key="s">No balance in the snapshot: the address is empty or was never used. Private lookups cover addresses that hold ZEC.</span>]]
      : [["Status", <span key="s">No activity in the snapshot</span>]];
  }
  return [
    ["Balance", <Zec key="b" zat={a.balance} showUsd />],
    ["Received / Sent", <span key="rs" className="inline-flex flex-wrap gap-2"><Zec zat={a.received} /> / <Zec zat={a.sent} /></span>],
    ["Transactions", int(a.txCount)],
    ["First / Last Activity", <span key="fl">Block {int(a.firstHeight)} / {int(a.lastHeight)}</span>],
  ];
}

export function LockIcon({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="4.5" y="10.5" width="15" height="10" rx="2" />
      <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

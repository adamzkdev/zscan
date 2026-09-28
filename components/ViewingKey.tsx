"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Hash } from "@/components/Hash";
import { PoolIcon, type ShieldedPool } from "@/components/PoolIcon";
import { TimeAgo } from "@/components/TimeAgo";
import { Card, Empty, Pill, Stat, tableHead, td, th } from "@/components/ui";
import { Zec } from "@/components/Zec";
import { int } from "@/lib/format";

/* ------------------------------------------------------------------ worker pool */

type KeyInfo = { network: string; kind: "full" | "incoming"; pools: ShieldedPool[]; has_transparent: boolean };
type Note = {
  txid: string;
  height: number;
  time: number;
  tx_index: number;
  pool: ShieldedPool;
  output_index: number;
  value: number;
  scope: "external" | "internal";
  nf: string | null;
};
type ScanChunk = { notes: Note[]; blocks: number; outputs: number };
type Spend = { nf: string; txid: string; height: number; time: number };
type Decrypted = { pool: ShieldedPool; index: number; kind: "received" | "change" | "sent"; value: number; memo: string | null; to: string | null };

type Pending = { resolve: (v: unknown) => void; reject: (e: Error) => void };

/** Web Workers each holding the key and a WebAssembly scanner; requests are id-matched. */
class Pool {
  workers: Worker[];
  pending = new Map<number, Pending>();
  next = 1;

  constructor(n: number) {
    this.workers = Array.from({ length: n }, () => {
      const w = new Worker("/wasm/scan-worker.js", { type: "module" });
      w.onmessage = ({ data }) => {
        const p = this.pending.get(data.id);
        if (!p) return;
        this.pending.delete(data.id);
        if (data.ok) p.resolve(data.result);
        else p.reject(new Error(data.error));
      };
      // A worker that fails to load (old browser, blocked WebAssembly) would never answer.
      w.onerror = (e) => {
        e.preventDefault();
        const err = new Error(`The scanner could not start in this browser${e.message ? `: ${e.message}` : ""}.`);
        for (const p of this.pending.values()) p.reject(err);
        this.pending.clear();
      };
      return w;
    });
  }

  call<T>(i: number, msg: Record<string, unknown>): Promise<T> {
    const id = this.next++;
    return new Promise<T>((resolve, reject) => {
      this.pending.set(id, { resolve: resolve as (v: unknown) => void, reject });
      this.workers[i].postMessage({ id, ...msg });
    });
  }

  all<T>(msg: Record<string, unknown>): Promise<T[]> {
    return Promise.all(this.workers.map((_, i) => this.call<T>(i, msg)));
  }

  terminate() {
    for (const w of this.workers) w.terminate();
    for (const p of this.pending.values()) p.reject(new Error("stopped"));
    this.pending.clear();
  }
}

/** Must match MAX_BLOCKS in crates/api/src/routes/compact.rs. */
const CHUNK = 500;

/* ------------------------------------------------------------------ history */

type Row = {
  txid: string;
  height: number;
  time: number;
  received: number;
  change: number;
  spent: number;
  pools: Set<ShieldedPool>;
  memos: string[];
  sentTo: { to: string; value: number }[];
};

function buildRows(notes: Note[], spends: Map<string, Spend>): Row[] {
  const rows = new Map<string, Row>();
  const row = (txid: string, height: number, time: number) => {
    let r = rows.get(txid);
    if (!r) {
      r = { txid, height, time, received: 0, change: 0, spent: 0, pools: new Set(), memos: [], sentTo: [] };
      rows.set(txid, r);
    }
    return r;
  };
  for (const n of notes) {
    const r = row(n.txid, n.height, n.time);
    if (n.scope === "external") r.received += n.value;
    else r.change += n.value;
    r.pools.add(n.pool);
    const s = n.nf ? spends.get(n.nf) : undefined;
    if (s) {
      const sr = row(s.txid, s.height, s.time);
      sr.spent += n.value;
      sr.pools.add(n.pool);
    }
  }
  return [...rows.values()].sort((a, b) => b.height - a.height);
}

const net = (r: Row) => r.received + r.change - r.spent;

function csv(rows: Row[]): string {
  const esc = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const z = (zat: number) => (zat / 1e8).toFixed(8);
  const lines = [["date_utc", "txid", "height", "type", "pools", "net_zec", "received_zec", "change_zec", "spent_zec", "memo", "sent_to"].join(",")];
  for (const r of rows) {
    lines.push(
      [
        new Date(r.time * 1000).toISOString(),
        r.txid,
        String(r.height),
        r.spent > 0 ? "sent" : "received",
        [...r.pools].join("+"),
        z(net(r)),
        z(r.received),
        z(r.change),
        z(r.spent),
        r.memos.join(" | "),
        r.sentTo.map((s) => `${s.to}:${z(s.value)}`).join(" | "),
      ]
        .map(esc)
        .join(","),
    );
  }
  return lines.join("\n") + "\n";
}

/* ------------------------------------------------------------------ component */

type Phase =
  | { kind: "idle" }
  | { kind: "scanning"; done: number; total: number; outputs: number; eta: number | null }
  | { kind: "done"; blocks: number; outputs: number; seconds: number }
  | { kind: "error"; message: string };

export function ViewingKeyExplorer({
  tip,
  network,
  presets,
}: {
  tip: number;
  network: string;
  presets: { label: string; height: number }[];
}) {
  const [key, setKey] = useState("");
  const [from, setFrom] = useState(String(presets[1]?.height ?? presets[0].height));
  const [info, setInfo] = useState<KeyInfo | null>(null);
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const [notes, setNotes] = useState<Note[]>([]);
  const [spends, setSpends] = useState<Map<string, Spend>>(new Map());
  const [memoState, setMemoState] = useState<"idle" | "loading" | "done">("idle");
  const [details, setDetails] = useState<Map<string, Decrypted[]>>(new Map());
  const [scanned, setScanned] = useState<{ from: number; to: number } | null>(null);
  const poolRef = useRef<Pool | null>(null);
  const cancelRef = useRef(false);

  const stop = useCallback(() => {
    cancelRef.current = true;
    poolRef.current?.terminate();
    poolRef.current = null;
  }, []);
  useEffect(() => stop, [stop]);

  const forget = () => {
    stop();
    setKey("");
    setInfo(null);
    setNotes([]);
    setSpends(new Map());
    setDetails(new Map());
    setMemoState("idle");
    setScanned(null);
    setPhase({ kind: "idle" });
  };

  const scan = async () => {
    stop();
    cancelRef.current = false;
    setNotes([]);
    setSpends(new Map());
    setDetails(new Map());
    setMemoState("idle");
    const start = Math.max(1, Math.min(tip, Number(from) || 0));
    const n = Math.max(1, Math.min(4, (typeof navigator !== "undefined" && navigator.hardwareConcurrency) || 2));
    const pool = new Pool(n);
    poolRef.current = pool;
    try {
      const [first] = await pool.all<{ info: KeyInfo }>({ type: "init", key: key.trim() });
      if (first.info.network !== network) {
        throw new Error(`This is a ${first.info.network} key, and this explorer shows ${network}.`);
      }
      setInfo(first.info);

      const chunks: [number, number][] = [];
      for (let h = start; h <= tip; h += CHUNK) chunks.push([h, Math.min(tip, h + CHUNK - 1)]);
      const total = tip - start + 1;
      const startedAt = Date.now();
      let done = 0;
      let outputs = 0;
      const found: Note[] = [];
      setPhase({ kind: "scanning", done, total, outputs, eta: null });

      let nextChunk = 0;
      await Promise.all(
        pool.workers.map(async (_, i) => {
          while (!cancelRef.current && nextChunk < chunks.length) {
            const [s, e] = chunks[nextChunk++];
            const r = await pool.call<ScanChunk>(i, { type: "scan", start: s, end: e });
            if (r.notes.length) {
              found.push(...r.notes);
              setNotes([...found]);
            }
            done += e - s + 1;
            outputs += r.outputs;
            const eta = Math.round((((Date.now() - startedAt) / done) * (total - done)) / 1000);
            setPhase({ kind: "scanning", done, total, outputs, eta });
          }
        }),
      );
      if (cancelRef.current) return;

      // Spends are indexed per worker: ask all of them about the notes found anywhere.
      const nfs = found.map((f) => f.nf).filter((x): x is string => !!x);
      const map = new Map<string, Spend>();
      if (nfs.length) {
        for (const r of await pool.all<{ spends: Spend[] }>({ type: "spent", nullifiers: nfs })) {
          for (const s of r.spends) map.set(s.nf, s);
        }
      }
      setSpends(map);
      setScanned({ from: start, to: tip });
      setPhase({ kind: "done", blocks: total, outputs, seconds: (Date.now() - startedAt) / 1000 });
    } catch (e) {
      if (!cancelRef.current) setPhase({ kind: "error", message: e instanceof Error ? e.message : String(e) });
      pool.terminate();
      poolRef.current = null;
    }
  };

  const rows = useMemo(() => {
    const rs = buildRows(notes, spends);
    for (const r of rs) {
      const d = details.get(r.txid);
      if (!d) continue;
      r.memos = d.filter((x) => x.kind !== "sent" && x.memo).map((x) => x.memo!);
      r.sentTo = d.filter((x) => x.kind === "sent" && x.to).map((x) => ({ to: x.to!, value: x.value }));
    }
    return rs;
  }, [notes, spends, details]);

  const unspent = notes.filter((n) => !(n.nf && spends.has(n.nf)));
  const byPool = (p: ShieldedPool) => unspent.filter((n) => n.pool === p).reduce((s, n) => s + n.value, 0);
  const balance = unspent.reduce((s, n) => s + n.value, 0);
  const received = notes.filter((n) => n.scope === "external").reduce((s, n) => s + n.value, 0);
  const incoming = info?.kind === "incoming";

  const loadMemos = async () => {
    const pool = poolRef.current;
    if (!pool) return;
    setMemoState("loading");
    const out = new Map(details);
    const queue = rows.map((r) => r.txid).filter((t) => !out.has(t));
    await Promise.all(
      pool.workers.map(async (_, i) => {
        while (queue.length) {
          const txid = queue.shift()!;
          try {
            const r = await pool.call<{ outputs: Decrypted[] }>(i, { type: "decrypt", txid });
            out.set(txid, r.outputs);
            setDetails(new Map(out));
          } catch {
            /* keep the rest */
          }
        }
      }),
    );
    setMemoState("done");
  };

  const download = () => {
    const blob = new Blob([csv(rows)], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `zscan-viewing-key-${scanned?.from ?? 0}-${scanned?.to ?? 0}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const scanning = phase.kind === "scanning";
  const pct = scanning ? Math.floor((phase.done / phase.total) * 100) : 0;
  const eta = scanning ? phase.eta : null;

  return (
    <div className="space-y-4">
      <Card title="Viewing key">
        <div className="space-y-3">
          <textarea
            value={key}
            onChange={(e) => setKey(e.target.value)}
            rows={3}
            spellCheck={false}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            placeholder="uview1…  (unified full viewing key)   or   uivk1…  (incoming only)   or   zxviews1…  (Sapling)"
            className="w-full resize-y rounded-lg border border-border bg-surface px-3 py-2 font-mono text-sm"
            disabled={scanning}
          />
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <label className="text-muted" htmlFor="vk-from">
              Scan from
            </label>
            <select
              id="vk-from"
              value={presets.some((p) => String(p.height) === from) ? from : "custom"}
              onChange={(e) => e.target.value !== "custom" && setFrom(e.target.value)}
              className="rounded-md border border-border bg-surface px-2 py-1"
              disabled={scanning}
            >
              {presets.map((p) => (
                <option key={p.label} value={p.height}>
                  {p.label}
                </option>
              ))}
              <option value="custom">Custom height</option>
            </select>
            <input
              value={from}
              onChange={(e) => setFrom(e.target.value.replace(/\D/g, ""))}
              inputMode="numeric"
              className="num w-32 rounded-md border border-border bg-surface px-2 py-1"
              aria-label="Start height"
              disabled={scanning}
            />
            <span className="text-muted">to tip #{int(tip)} ({int(Math.max(0, tip - (Number(from) || tip) + 1))} blocks)</span>
            <div className="ml-auto flex gap-2">
              {scanning ? (
                <button type="button" onClick={() => { stop(); setPhase({ kind: "idle" }); }} className="rounded-lg border border-border px-4 py-1.5 hover:bg-surface-2">
                  Stop
                </button>
              ) : (
                <button
                  type="button"
                  onClick={scan}
                  disabled={!key.trim()}
                  className="rounded-lg bg-link px-4 py-1.5 font-medium text-white disabled:opacity-50"
                >
                  Scan
                </button>
              )}
              {(key || notes.length > 0) && !scanning && (
                <button type="button" onClick={forget} className="rounded-lg border border-border px-4 py-1.5 hover:bg-surface-2">
                  Forget key
                </button>
              )}
            </div>
          </div>
          {scanning && (
            <div>
              <div className="h-2 overflow-hidden rounded-full bg-surface-2">
                <div className="h-full bg-link transition-[width]" style={{ width: `${pct}%` }} />
              </div>
              <p className="mt-1.5 text-xs text-muted">
                {pct}% · {int(phase.done)} / {int(phase.total)} blocks · {int(phase.outputs)} shielded outputs tried
                {eta != null && ` · about ${eta}s left`} · {notes.length} note{notes.length === 1 ? "" : "s"} found so far
              </p>
            </div>
          )}
          {phase.kind === "error" && <p role="alert" className="rounded-lg border border-bad/30 bg-bad/10 px-3 py-2 text-sm text-bad">{phase.message}</p>}
        </div>
      </Card>

      {info && (phase.kind === "done" || notes.length > 0) && (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat label={incoming ? "Received (scanned range)" : "Shielded balance"} value={<Zec zat={incoming ? received : balance} showUsd />} sub={incoming ? "Incoming key: spends are not visible" : `${unspent.length} unspent note${unspent.length === 1 ? "" : "s"}`} />
            {(["ironwood", "orchard", "sapling"] as const)
              .filter((p) => info.pools.includes(p))
              .map((p) => (
                <Stat key={p} label={`${p[0].toUpperCase()}${p.slice(1)}`} value={<Zec zat={incoming ? notes.filter((n) => n.pool === p).reduce((s, n) => s + n.value, 0) : byPool(p)} />} />
              ))}
          </div>

          <Card
            pad={false}
            title={
              <span className="text-sm font-normal text-muted">
                {rows.length} transaction{rows.length === 1 ? "" : "s"}
                {phase.kind === "done" && ` · ${int(phase.blocks)} blocks, ${int(phase.outputs)} outputs scanned in ${phase.seconds.toFixed(0)}s`}
              </span>
            }
            action={
              phase.kind === "done" && rows.length > 0 ? (
                <div className="flex gap-2 text-sm">
                  {memoState !== "done" && (
                    <button
                      type="button"
                      onClick={loadMemos}
                      disabled={memoState === "loading"}
                      className="rounded-md border border-border px-3 py-1 hover:bg-surface-2 disabled:opacity-60"
                      title="Downloads the full transactions: ZScan's server sees which transactions are requested (it keeps no logs)."
                    >
                      {memoState === "loading" ? "Loading memos…" : incoming ? "Load memos" : "Load memos & recipients"}
                    </button>
                  )}
                  <button type="button" onClick={download} className="rounded-md border border-border px-3 py-1 hover:bg-surface-2">
                    Export CSV
                  </button>
                </div>
              ) : undefined
            }
          >
            {rows.length ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px]">
                  <thead className={tableHead}>
                    <tr>
                      <th className={th}>Transaction Hash</th>
                      <th className={th}>Block</th>
                      <th className={th}>Age</th>
                      <th className={th}>Type</th>
                      <th className={th}>Pool</th>
                      <th className={`${th} text-right`}>Amount</th>
                      <th className={th}>Memo / Recipient</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {rows.map((r) => {
                      const v = net(r);
                      return (
                        <tr key={r.txid} className="hover:bg-surface-2">
                          <td className={td}>
                            <Hash value={r.txid} href={`/tx/${r.txid}`} />
                          </td>
                          <td className={td}>
                            <Link href={`/block/${r.height}`} className="num text-link hover:text-link-hover">
                              {r.height}
                            </Link>
                          </td>
                          <td className={`${td} text-muted`}>
                            <TimeAgo iso={new Date(r.time * 1000).toISOString()} />
                          </td>
                          <td className={td}>{r.spent > 0 ? <Pill tone="warn">OUT</Pill> : <Pill tone="good">IN</Pill>}</td>
                          <td className={td}>
                            <span className="inline-flex gap-1">
                              {[...r.pools].map((p) => (
                                <PoolIcon key={p} pool={p} />
                              ))}
                            </span>
                          </td>
                          <td className={`${td} text-right ${v >= 0 ? "text-good" : "text-bad"}`}>
                            {v >= 0 ? "+" : "−"}
                            <Zec zat={Math.abs(v)} />
                          </td>
                          <td className={`${td} max-w-[320px] whitespace-normal text-xs`}>
                            {r.memos.map((m, i) => (
                              <p key={i} className="break-words">
                                {m}
                              </p>
                            ))}
                            {r.sentTo.map((s, i) => (
                              <p key={i} className="text-muted">
                                → <span className="font-mono">{s.to.slice(0, 14)}…</span> <Zec zat={s.value} />
                              </p>
                            ))}
                            {!r.memos.length && !r.sentTo.length && <span className="text-faint">{details.has(r.txid) ? "—" : ""}</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <Empty>No shielded activity for this key in the scanned blocks. Scan from an earlier height to look further back.</Empty>
            )}
          </Card>
          {info.has_transparent && (
            <p className="text-xs text-muted">
              This key also has a transparent part. Transparent addresses are public: look them up with the search box.
            </p>
          )}
        </>
      )}
    </div>
  );
}

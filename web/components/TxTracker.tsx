"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  blockQuantile,
  conventionalFee,
  duration,
  FINAL_CONFIRMATIONS,
  logicalActions,
  paysConventional,
  TRUSTED_CONFIRMATIONS,
} from "@/lib/estimate";
import { int, zec } from "@/lib/format";
import type { TxDetail } from "@/lib/types";
import { useLive } from "./live";
import { LiveDot } from "./LiveHome";

const subscribe = (cb: () => void) => {
  const t = setInterval(cb, 1000);
  return () => clearInterval(t);
};
const second = () => Math.floor(Date.now() / 1000) * 1000;
/** Current time, ticking every second on the client; null during server rendering. */
export const useNow = () => useSyncExternalStore(subscribe, second, () => null);

export type ChainContext = {
  tip: number;
  lastBlockAt: string | null;
  blockTime: number;
  marginalFee: number;
  graceActions: number;
  fitsNextBlock: boolean;
};

const STEPS = ["Pending", "In a block", `${TRUSTED_CONFIRMATIONS} confirmations`, "Final"];

/**
 * Live progress of a pending or not-yet-final transaction: mempool → block → confirmations,
 * with next-block and finality estimates. Render it only while the transaction is not yet final.
 */
export function TxTracker({ initial, chain }: { initial: TxDetail; chain: ChainContext }) {
  const [tx, setTx] = useState(initial);
  const [tip, setTip] = useState(chain.tip);
  const [lastBlockAt, setLastBlockAt] = useState(() =>
    chain.lastBlockAt ? Date.parse(chain.lastBlockAt) : null,
  );
  const [justMined, setJustMined] = useState(false);
  const wasPending = useRef(initial.status === "mempool");
  const now = useNow();

  useLive(async (e) => {
    if (e.type !== "block") return;
    setTip((t) => Math.max(t, e.data.height));
    setLastBlockAt(Date.now());
    const next = await fetch(`/v1/tx/${tx.txid}`)
      .then((r) => (r.ok ? (r.json() as Promise<TxDetail>) : null))
      .catch(() => null);
    if (!next) return;
    if (wasPending.current && next.status === "mined") {
      wasPending.current = false;
      setJustMined(true);
    }
    setTx(next);
  });

  useEffect(() => {
    if (!justMined) return;
    const t = setTimeout(() => setJustMined(false), 4000);
    return () => clearTimeout(t);
  }, [justMined]);

  const pending = tx.status === "mempool";
  const conf = tx.height != null ? Math.max(tx.confirmations ?? 0, tip - tx.height + 1) : 0;
  const final = !pending && conf >= FINAL_CONFIRMATIONS;
  const step = pending ? 0 : final ? 4 : conf >= TRUSTED_CONFIRMATIONS ? 3 : 2;
  const T = chain.blockTime;
  const elapsed = now != null && lastBlockAt != null ? (now - lastBlockAt) / 1000 : null;

  const actions = logicalActions(tx);
  const conventional = conventionalFee(actions, chain.marginalFee, chain.graceActions);
  const paysFull = paysConventional(tx.fee, actions, chain.marginalFee, chain.graceActions);
  const expiresIn = tx.expiry_height ? tx.expiry_height - tip : null;

  const headline = pending
    ? "Waiting to be mined"
    : final
      ? "Final"
      : justMined
        ? "Included in a block!"
        : "Confirming";

  return (
    <section className="card overflow-hidden" aria-live="polite">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div className="flex items-center gap-2 font-medium">
          {final ? <CheckBadge /> : <LiveDot />}
          <span className={justMined ? "tracker-pop text-good" : ""}>{headline}</span>
        </div>
        <p className="text-sm text-muted">
          {pending
            ? paysFull
              ? <>Expected in the <b className="text-text">next block</b>{elapsed != null && <> · ≈ {duration(T)} on average</>}</>
              : <>May be delayed: fee below the ZIP-317 conventional fee</>
            : final
              ? <>{int(conf)} confirmations · safe to treat as settled</>
              : <>Final in ≈ <b className="text-text">{duration((FINAL_CONFIRMATIONS - conf) * T)}</b> ({FINAL_CONFIRMATIONS - conf} more block{FINAL_CONFIRMATIONS - conf === 1 ? "" : "s"})</>}
        </p>
      </div>

      <div className="px-4 py-5">
        <Stepper step={step} />
      </div>

      {!final && (
        <div className="grid gap-4 border-t border-border px-4 py-4 md:grid-cols-[1fr_auto] md:items-center">
          <NextBlock elapsed={elapsed} blockTime={T} label={pending ? "Next block (your transaction)" : "Next confirmation"} />
          {pending ? (
            <div className="space-y-1 text-sm md:min-w-64 md:text-right">
              <p className="text-muted">
                50% within <b className="text-text">{duration(blockQuantile(0.5, T))}</b> · 90% within{" "}
                <b className="text-text">{duration(blockQuantile(0.9, T))}</b>
              </p>
              <p className={paysFull ? "text-good" : "text-warn"}>
                {paysFull ? "✓ " : "⚠ "}Fee {zec(tx.fee)} ZEC {paysFull ? "≥" : "<"} conventional {zec(conventional)} ZEC
                {!chain.fitsNextBlock && paysFull && <span className="text-warn"> · mempool is busy</span>}
              </p>
              {expiresIn != null && expiresIn > 0 && (
                <p className="text-muted">
                  Expires at block {int(tx.expiry_height)} if not mined (≈ {duration(expiresIn * T)})
                </p>
              )}
            </div>
          ) : (
            <ConfirmRing conf={conf} />
          )}
        </div>
      )}
      <p className="border-t border-border bg-surface-2/50 px-4 py-2 text-xs text-muted">
        Zcash finality is probabilistic: every new block makes reversing this transaction exponentially harder.
        Wallets treat {FINAL_CONFIRMATIONS} confirmations as final (ZIP 315). Estimates assume ~{Math.round(T)}s blocks.
      </p>
    </section>
  );
}

function Stepper({ step }: { step: number }) {
  return (
    <ol className="flex items-start">
      {STEPS.map((label, i) => {
        const done = i < step;
        const active = i === step;
        return (
          <li key={label} className="relative flex flex-1 flex-col items-center gap-2 text-center last:flex-none md:last:flex-1">
            {i < STEPS.length - 1 && (
              <span className="absolute left-1/2 top-3.5 h-0.5 w-full overflow-hidden bg-border" aria-hidden>
                <span
                  className="absolute inset-y-0 left-0 bg-good transition-[width] duration-700"
                  style={{ width: done && i + 1 < step ? "100%" : done ? "50%" : "0%" }}
                />
                {(i + 1 === step || (step === 0 && i === 0)) && (
                  <span className="tracker-flow absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-link to-transparent" />
                )}
              </span>
            )}
            <span
              className={`relative z-10 grid size-7 place-items-center rounded-full border-2 text-xs font-semibold transition-colors duration-500 ${
                done
                  ? "tracker-pop border-good bg-good text-white"
                  : active
                    ? "tracker-glow border-link bg-surface text-link"
                    : "border-border-strong bg-surface text-muted"
              }`}
            >
              {done ? "✓" : i + 1}
            </span>
            <span className={`text-xs sm:text-sm ${active ? "font-medium text-text" : done ? "text-good" : "text-muted"}`}>
              {label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/** Time since the last block against the average block time; stripes once the block is "late". */
export function NextBlock({ elapsed, blockTime, label }: { elapsed: number | null; blockTime: number; label: string }) {
  const late = elapsed != null && elapsed > blockTime;
  const pct = elapsed == null ? 0 : Math.min(elapsed / blockTime, 1) * 100;
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="text-muted">{label}</span>
        <span className="num text-text">
          {elapsed == null
            ? "—"
            : late
              ? "any moment now"
              : `≈ ${duration(blockTime - elapsed)}`}
        </span>
      </div>
      <div className="relative h-2.5 overflow-hidden rounded-full bg-surface-2">
        {late ? (
          <div className="tracker-stripes absolute inset-0 rounded-full" />
        ) : (
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-link/60 to-link transition-[width] duration-1000 ease-linear"
            style={{ width: `${pct}%` }}
          />
        )}
      </div>
      <p className="text-xs text-muted">
        {elapsed == null ? " " : `${duration(elapsed)} since the last block · blocks are random, not scheduled`}
      </p>
    </div>
  );
}

function ConfirmRing({ conf }: { conf: number }) {
  const r = 26;
  const c = 2 * Math.PI * r;
  const frac = Math.min(conf / FINAL_CONFIRMATIONS, 1);
  return (
    <div className="flex items-center gap-3 md:justify-end">
      <svg width="64" height="64" viewBox="0 0 64 64" className="-rotate-90" aria-hidden>
        <circle cx="32" cy="32" r={r} fill="none" stroke="var(--surface-2)" strokeWidth="6" />
        <circle
          cx="32"
          cy="32"
          r={r}
          fill="none"
          stroke="var(--good)"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - frac)}
          style={{ transition: "stroke-dashoffset 900ms cubic-bezier(0.2, 0.8, 0.3, 1)" }}
        />
      </svg>
      <div className="text-sm">
        <p className="num text-lg font-medium text-text">
          {conf} / {FINAL_CONFIRMATIONS}
        </p>
        <p className="text-muted">confirmations</p>
      </div>
    </div>
  );
}

function CheckBadge() {
  return (
    <span className="tracker-pop grid size-5 place-items-center rounded-full bg-good text-[11px] text-white" aria-hidden>
      ✓
    </span>
  );
}

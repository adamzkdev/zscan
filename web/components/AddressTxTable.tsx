"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { CURRENCIES, dailyIndex, money, useCurrency, type Currency } from "@/lib/currency";
import { int, short, utc } from "@/lib/format";
import { KIND_HELP, KIND_LABEL } from "@/lib/kinds";
import type { AddressDetail, TxKind } from "@/lib/types";
import { KindBadge } from "./KindBadge";
import { TimeAgo } from "./TimeAgo";
import { Empty, Pill, tableHead, td, th, Zec } from "./ui";

const KINDS = Object.keys(KIND_LABEL) as TxKind[];
const PAGE = 25;

type Filters = { kind?: string; direction?: string; sort?: string; order?: string; page?: string };

export function AddressTxTable({
  a,
  rates,
  usdHistory,
}: {
  a: AddressDetail;
  rates: Record<string, number> | null;
  usdHistory: [number, number][];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [currency, setCurrency] = useCurrency();
  const [unit, setUnit] = useState<"zec" | "fiat">("zec");
  const [historical, setHistorical] = useState(false);
  const [dates, setDates] = useState(false);
  const daily = dailyIndex(usdHistory);

  const f: Filters = Object.fromEntries(params.entries());
  const page = Math.max(0, Number(f.page ?? 0) || 0);
  const sortAmount = f.sort === "amount";
  const asc = f.order === "asc";

  const href = (next: Partial<Filters>) => {
    const q = new URLSearchParams(params);
    for (const [k, v] of Object.entries(next)) {
      if (v == null || v === "") q.delete(k);
      else q.set(k, v);
    }
    if (!("page" in next)) q.delete("page");
    const s = q.toString();
    return s ? `${pathname}?${s}` : pathname;
  };
  const go = (next: Partial<Filters>) => startTransition(() => router.push(href(next), { scroll: false }));

  const rate = rates?.[currency];
  const value = (t: AddressDetail["txs"][number]) => {
    const zec = Math.abs(t.delta) / 1e8;
    if (rate == null) return null;
    if (!historical) return zec * rate;
    const close = daily.get(t.time.slice(0, 10));
    // Daily USD close, converted at today's cross rate for other currencies.
    return close != null && rates?.usd ? zec * close * (rate / rates.usd) : zec * rate;
  };

  const active = [
    f.kind && { key: "kind", label: `Method: ${KIND_LABEL[f.kind as TxKind] ?? f.kind}` },
    f.direction && { key: "direction", label: f.direction === "in" ? "Incoming" : "Outgoing" },
    f.sort === "amount" && { key: "sort", label: `Amount ${asc ? "ascending" : "descending"}` },
    f.sort !== "amount" && asc && { key: "order", label: "Oldest first" },
  ].filter(Boolean) as { key: keyof Filters; label: string }[];

  const from = a.filtered_count ? page * PAGE + 1 : 0;
  const to = page * PAGE + a.txs.length;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted">
            {a.filtered_count === a.tx_count
              ? `${int(a.tx_count)} transactions`
              : `${int(a.filtered_count)} of ${int(a.tx_count)} transactions`}
          </span>
          {active.map((c) => (
            <button
              key={c.key}
              type="button"
              onClick={() => go(c.key === "sort" ? { sort: undefined, order: undefined } : { [c.key]: undefined })}
              className="inline-flex items-center gap-1 rounded-full border border-link/30 bg-link/10 px-2.5 py-0.5 text-xs text-link hover:bg-link/20"
              aria-label={`Remove filter ${c.label}`}
            >
              {c.label} <span aria-hidden>×</span>
            </button>
          ))}
          {active.length > 1 && (
            <button type="button" onClick={() => startTransition(() => router.push(pathname, { scroll: false }))} className="text-xs text-muted hover:text-link">
              Clear all
            </button>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Segmented
            value={unit}
            onChange={setUnit}
            options={[
              { value: "zec", label: "ZEC" },
              { value: "fiat", label: `Value (${currency.toUpperCase()})` },
            ]}
          />
          {unit === "fiat" && (
            <Segmented
              value={historical ? "then" : "now"}
              onChange={(v) => setHistorical(v === "then")}
              options={[
                { value: "now", label: "Now" },
                { value: "then", label: "At tx time" },
              ]}
            />
          )}
          <CurrencyMenu value={currency} onChange={setCurrency} />
        </div>
      </div>

      <div className={`overflow-x-auto transition-opacity ${pending ? "opacity-50" : ""}`} aria-busy={pending}>
        <table className="w-full min-w-[760px]">
          <thead className={tableHead}>
            <tr>
              <th className={th}>Transaction Hash</th>
              <th className={th}>
                <HeaderMenu label="Method" active={!!f.kind}>
                  {(close) => (
                    <>
                      <MenuItem selected={!f.kind} onClick={() => (close(), go({ kind: undefined }))}>
                        All methods
                      </MenuItem>
                      {KINDS.map((k) => (
                        <MenuItem key={k} selected={f.kind === k} onClick={() => (close(), go({ kind: k }))} hint={KIND_HELP[k]}>
                          <KindBadge kind={k} />
                        </MenuItem>
                      ))}
                    </>
                  )}
                </HeaderMenu>
              </th>
              <th className={th}>Block</th>
              <th className={th}>
                <span className="inline-flex items-center gap-1">
                  <button type="button" onClick={() => setDates((d) => !d)} className="text-link hover:text-link-hover" title="Toggle age / date">
                    {dates ? "Date Time (UTC)" : "Age"}
                  </button>
                  <SortButton
                    active={!sortAmount}
                    asc={!sortAmount && asc}
                    label="Sort by time"
                    onClick={() => go({ sort: undefined, order: !sortAmount && !asc ? "asc" : undefined })}
                  />
                </span>
              </th>
              <th className={th}>
                <HeaderMenu label="Direction" active={!!f.direction}>
                  {(close) => (
                    <>
                      <MenuItem selected={!f.direction} onClick={() => (close(), go({ direction: undefined }))}>All</MenuItem>
                      <MenuItem selected={f.direction === "in"} onClick={() => (close(), go({ direction: "in" }))}>
                        <Pill tone="good">IN</Pill> <span className="ml-1">Incoming</span>
                      </MenuItem>
                      <MenuItem selected={f.direction === "out"} onClick={() => (close(), go({ direction: "out" }))}>
                        <Pill tone="warn">OUT</Pill> <span className="ml-1">Outgoing</span>
                      </MenuItem>
                    </>
                  )}
                </HeaderMenu>
              </th>
              <th className={`${th} text-right`}>
                <span className="inline-flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setUnit((u) => (u === "zec" ? "fiat" : "zec"))}
                    className="text-link hover:text-link-hover"
                    title="Switch between ZEC and value"
                  >
                    {unit === "zec" ? "Amount" : `Value (${currency.toUpperCase()})`}
                  </button>
                  <SortButton
                    active={sortAmount}
                    asc={sortAmount && asc}
                    label="Sort by amount"
                    onClick={() => go(sortAmount ? (asc ? { sort: undefined, order: undefined } : { sort: "amount", order: "asc" }) : { sort: "amount", order: undefined })}
                  />
                </span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {a.txs.map((t) => (
              <tr key={t.txid} className="hover:bg-surface-2">
                <td className={td}>
                  <Link href={`/tx/${t.txid}`} className="font-mono text-link hover:text-link-hover">
                    {short(t.txid, 14, 0)}
                  </Link>
                </td>
                <td className={td}>
                  <button type="button" onClick={() => go({ kind: f.kind === t.kind ? undefined : t.kind })} title={`Filter by ${KIND_LABEL[t.kind]}`}>
                    <KindBadge kind={t.kind} />
                  </button>
                </td>
                <td className={td}>
                  <Link href={`/block/${t.height}`} className="num text-link hover:text-link-hover">
                    {t.height}
                  </Link>
                </td>
                <td className={`${td} text-muted`}>{dates ? <span className="num">{utc(t.time)}</span> : <TimeAgo iso={t.time} />}</td>
                <td className={td}>{t.delta >= 0 ? <Pill tone="good">IN</Pill> : <Pill tone="warn">OUT</Pill>}</td>
                <td className={`${td} text-right`}>
                  {unit === "zec" ? (
                    <Zec zat={Math.abs(t.delta)} />
                  ) : (
                    <span
                      className="num"
                      title={
                        historical
                          ? currency === "usd"
                            ? "Daily closing price on the day of the transaction"
                            : "Daily USD close on the day of the transaction, converted at today's rate"
                          : "At today's price"
                      }
                    >
                      {money(value(t), currency as Currency)}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!a.txs.length && <Empty>{active.length ? "No transactions match these filters." : "No activity in the indexed range."}</Empty>}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3 text-sm">
        <span className="text-xs text-faint">
          {a.filtered_count > 0 && `Showing ${int(from)}–${int(to)} of ${int(a.filtered_count)} · `}
          {a.indexed_from != null && `Activity indexed from block ${int(a.indexed_from)}. Balance covers full history.`}
        </span>
        <div className="flex gap-2">
          {page > 0 && (
            <Link href={href({ page: page - 1 ? String(page - 1) : undefined })} scroll={false} className="rounded-md border border-border px-3 py-1 text-link hover:bg-surface-2">
              ‹ Prev
            </Link>
          )}
          {to < a.filtered_count && (
            <Link href={href({ page: String(page + 1) })} scroll={false} className="rounded-md border border-border px-3 py-1 text-link hover:bg-surface-2">
              Next ›
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

function Segmented<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[] }) {
  return (
    <div className="inline-flex rounded-lg border border-border bg-surface-2 p-0.5 text-xs">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
          className={`rounded-md px-2.5 py-1 ${value === o.value ? "bg-surface font-medium text-text shadow-sm" : "text-muted hover:text-text"}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function SortButton({ active, asc, label, onClick }: { active: boolean; asc: boolean; label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} title={label} className={`rounded p-0.5 ${active ? "text-link" : "text-faint hover:text-muted"}`}>
      <svg width="12" height="12" viewBox="0 0 24 24" aria-hidden className={`transition-transform ${active && asc ? "rotate-180" : ""}`}>
        <path d="M12 5v14m0 0-6-6m6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}

function useOutside(open: boolean, close: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && close();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close]);
  return ref;
}

/** Column header with a filter popover (funnel icon), like Etherscan's. */
function HeaderMenu({ label, active, children }: { label: string; active: boolean; children: (close: () => void) => ReactNode }) {
  const [open, setOpen] = useState(false);
  const ref = useOutside(open, () => setOpen(false));
  return (
    <div ref={ref} className="relative inline-flex items-center gap-1">
      {label}
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Filter by ${label.toLowerCase()}`}
        onClick={() => setOpen((o) => !o)}
        className={`rounded p-0.5 ${active ? "text-link" : "text-faint hover:text-muted"}`}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" aria-hidden>
          <path d="M3 5h18l-7 8v6l-4-2v-4z" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <div role="menu" className="absolute left-0 top-full z-50 mt-1 min-w-52 overflow-hidden rounded-lg border border-border bg-surface p-1 font-normal shadow-xl">
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}

function MenuItem({ selected, onClick, hint, children }: { selected: boolean; onClick: () => void; hint?: string; children: ReactNode }) {
  return (
    <button
      type="button"
      role="menuitemradio"
      aria-checked={selected}
      onClick={onClick}
      title={hint}
      className={`flex w-full items-center justify-between gap-3 rounded-md px-2.5 py-1.5 text-left text-sm hover:bg-surface-2 ${selected ? "text-link" : "text-text"}`}
    >
      <span className="flex items-center">{children}</span>
      {selected && <span aria-hidden>✓</span>}
    </button>
  );
}

function CurrencyMenu({ value, onChange }: { value: Currency; onChange: (c: Currency) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useOutside(open, () => setOpen(false));
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Display currency"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface-2 px-2.5 py-1 text-xs text-text hover:border-border-strong"
      >
        {value.toUpperCase()}
        <svg width="9" height="9" viewBox="0 0 24 24" aria-hidden className={open ? "rotate-180" : ""}>
          <path d="m6 9 6 6 6-6" fill="none" stroke="currentColor" strokeWidth="3" />
        </svg>
      </button>
      {open && (
        <ul role="listbox" className="absolute right-0 z-50 mt-1 w-48 overflow-hidden rounded-lg border border-border bg-surface p-1 shadow-xl">
          {CURRENCIES.map((c) => (
            <li key={c.code}>
              <button
                type="button"
                role="option"
                aria-selected={c.code === value}
                onClick={() => {
                  onChange(c.code);
                  setOpen(false);
                }}
                className={`flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-sm hover:bg-surface-2 ${c.code === value ? "text-link" : "text-text"}`}
              >
                <span>
                  <span className="font-medium">{c.label}</span> <span className="text-muted">{c.name}</span>
                </span>
                {c.code === value && <span aria-hidden>✓</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

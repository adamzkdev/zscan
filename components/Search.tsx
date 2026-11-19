"use client";

import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import { Dropdown } from "./Dropdown";
import { classifyPrivate, LockIcon, startPrivateLookup, usePirAvailable } from "./PrivateLookup";

const ROUTES: Record<string, (id: string) => string> = {
  block: (id) => `/block/${id}`,
  tx: (id) => `/tx/${id}`,
  address: (id) => `/address/${id}`,
  shielded_address: (id) => `/shielded/${encodeURIComponent(id)}`,
  inscription: (id) => `/inscription/${id}`,
  collection: (id) => `/collection/${encodeURIComponent(id)}`,
};

const FILTERS = [
  ["all", "All Filters"],
  ["block", "Blocks"],
  ["tx", "Transactions"],
  ["address", "Addresses"],
] as const;

/* The "Private" toggle is remembered in this browser, shared by every search bar on the page. */
const PRIVATE_KEY = "private-search";
const privateListeners = new Set<() => void>();
const readPrivate = () => {
  try {
    return localStorage.getItem(PRIVATE_KEY) === "1";
  } catch {
    return false;
  }
};
function setPrivateMode(on: boolean) {
  try {
    if (on) localStorage.setItem(PRIVATE_KEY, "1");
    else localStorage.removeItem(PRIVATE_KEY);
  } catch {}
  privateListeners.forEach((l) => l());
}
const subscribePrivate = (cb: () => void) => {
  privateListeners.add(cb);
  return () => privateListeners.delete(cb);
};

export function Search({ variant = "compact" }: { variant?: "hero" | "compact" }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<(typeof FILTERS)[number][0]>("all");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pir = usePirAvailable();
  const privateOn = useSyncExternalStore(subscribePrivate, readPrivate, () => false) && pir === true;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const query = q.trim();
    if (!query) return;
    setError(null);
    // Private mode: classified here and handed to /private in memory. Nothing is sent to /v1/search.
    if (privateOn) {
      const p = classifyPrivate(query);
      if (!p) return setError("Private lookup takes a transaction hash or a transparent address.");
      startPrivateLookup(p);
      setQ("");
      router.push("/private");
      return;
    }
    setBusy(true);
    try {
      const r: { type: string; id: string } = await fetch(`/v1/search?q=${encodeURIComponent(query)}`).then((r) => r.json());
      const matches = filter === "all" || r.type === filter || (filter === "address" && r.type === "shielded_address");
      const route = matches ? ROUTES[r.type] : undefined;
      if (route) {
        router.push(route(r.id));
        setQ("");
      } else {
        setError("No match found for this search.");
      }
    } catch {
      setError("Search is unavailable right now.");
    } finally {
      setBusy(false);
    }
  }

  const hero = variant === "hero";
  return (
    <form onSubmit={submit} className="relative w-full">
      <div
        className={`flex items-center border bg-surface focus-within:border-link ${privateOn ? "border-link/50" : "border-border"} ${
          hero ? "rounded-lg p-1.5 shadow-lg" : "rounded-lg"
        }`}
      >
        {hero && (
          <Dropdown
            label="Search filter"
            value={filter}
            onChange={setFilter}
            options={FILTERS.map(([v, l]) => ({ value: v, label: l }))}
            className="mr-1 hidden self-stretch sm:block"
          />
        )}
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={privateOn ? "Txn Hash / transparent Address, privately" : "Search by Address / Txn Hash / Block"}
          aria-label={privateOn ? "Private lookup" : "Search"}
          spellCheck={false}
          autoComplete={privateOn ? "off" : undefined}
          className={`w-full min-w-0 bg-transparent px-3 text-text outline-none placeholder:text-faint ${hero ? "py-2 text-[0.95rem]" : "py-1.5 text-sm"}`}
        />
        {/* The tooltip sits on a wrapper: disabled buttons don't show one in every browser. */}
        <span
          className="shrink-0"
          title={
            pir === false
              ? "Private lookup (PIR) is unavailable"
              : privateOn
                ? "Private lookup on: ZScan won't learn which transaction or address you look up"
                : "Private lookup: ZScan won't learn which transaction or address you look up"
          }
        >
          <button
            type="button"
            onClick={() => setPrivateMode(!privateOn)}
            disabled={pir !== true}
            aria-pressed={privateOn}
            className={`inline-flex items-center gap-1 whitespace-nowrap rounded-md border font-medium disabled:cursor-not-allowed disabled:opacity-50 ${
              hero ? "mr-1.5 px-2.5 py-1.5 text-xs" : "mr-0.5 px-1.5 py-0.5 text-[11px]"
            } ${privateOn ? "border-link/40 bg-link/10 text-link" : "border-border text-muted enabled:hover:text-text"}`}
          >
            <LockIcon size={hero ? 12 : 11} /> Private
          </button>
        </span>
        <button
          type="submit"
          disabled={busy}
          aria-label={privateOn ? "Look up privately" : "Search"}
          className={`grid shrink-0 place-items-center rounded-md bg-link text-white hover:bg-link-hover disabled:opacity-60 ${hero ? "size-10" : "m-1 size-7"}`}
        >
          <svg width={hero ? 18 : 14} height={hero ? 18 : 14} viewBox="0 0 24 24" aria-hidden>
            <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="2.4" />
            <path d="m20 20-4-4" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
          </svg>
        </button>
      </div>
      {error && <p className={`mt-2 text-sm ${hero ? "text-white/80" : "text-bad"}`}>{error}</p>}
    </form>
  );
}

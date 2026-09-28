"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Dropdown } from "./Dropdown";

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

export function Search({ variant = "compact" }: { variant?: "hero" | "compact" }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<(typeof FILTERS)[number][0]>("all");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const query = q.trim();
    if (!query) return;
    setBusy(true);
    setError(null);
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
        className={`flex items-center border border-border bg-surface focus-within:border-link ${
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
          placeholder="Search by Address / Txn Hash / Block"
          aria-label="Search"
          spellCheck={false}
          className={`w-full min-w-0 bg-transparent px-3 text-text outline-none placeholder:text-faint ${hero ? "py-2 text-[0.95rem]" : "py-1.5 text-sm"}`}
        />
        <button
          type="submit"
          disabled={busy}
          aria-label="Search"
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

"use client";

import { useSyncExternalStore } from "react";

export const CURRENCIES = [
  { code: "usd", label: "USD", name: "US Dollar" },
  { code: "eur", label: "EUR", name: "Euro" },
  { code: "gbp", label: "GBP", name: "British Pound" },
  { code: "chf", label: "CHF", name: "Swiss Franc" },
  { code: "jpy", label: "JPY", name: "Japanese Yen" },
  { code: "cad", label: "CAD", name: "Canadian Dollar" },
  { code: "aud", label: "AUD", name: "Australian Dollar" },
  { code: "btc", label: "BTC", name: "Bitcoin" },
  { code: "eth", label: "ETH", name: "Ether" },
] as const;

export type Currency = (typeof CURRENCIES)[number]["code"];

const KEY = "zscan.currency";
const listeners = new Set<() => void>();

function read(): Currency {
  try {
    const v = window.localStorage.getItem(KEY);
    if (v && CURRENCIES.some((c) => c.code === v)) return v as Currency;
  } catch {}
  return "usd";
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => e.key === KEY && cb();
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}

/** The viewer's display currency, remembered in this browser (USD by default). */
export function useCurrency(): [Currency, (c: Currency) => void] {
  const value = useSyncExternalStore(subscribe, read, () => "usd" as Currency);
  const set = (c: Currency) => {
    try {
      window.localStorage.setItem(KEY, c);
    } catch {}
    listeners.forEach((l) => l());
  };
  return [value, set];
}

/** Formats an amount in `currency`: "$1,234.56", "€12.30", "0.0213 BTC". */
export function money(amount: number | null | undefined, currency: Currency): string {
  if (amount == null || !Number.isFinite(amount)) return "—";
  if (currency === "btc" || currency === "eth") {
    const digits = Math.abs(amount) >= 1 ? 4 : 6;
    return `${amount.toLocaleString("en-US", { maximumFractionDigits: digits })} ${currency.toUpperCase()}`;
  }
  return amount.toLocaleString("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
    maximumFractionDigits: currency === "jpy" ? 0 : 2,
  });
}

/** Daily USD closes keyed by UTC day ("2026-09-26"). */
export function dailyIndex(history: [number, number][]): Map<string, number> {
  return new Map(history.map(([t, p]) => [new Date(t).toISOString().slice(0, 10), p]));
}

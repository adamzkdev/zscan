"use client";

import { createContext, useContext } from "react";

const PriceContext = createContext<number | null>(null);

export function PriceProvider({ usd, children }: { usd: number | null; children: React.ReactNode }) {
  return <PriceContext.Provider value={usd}>{children}</PriceContext.Provider>;
}

export function useZecUsd() {
  return useContext(PriceContext);
}

export { usd } from "@/lib/format";

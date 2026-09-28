"use client";

import { usd, useZecUsd } from "./price";
import { ZecIcon } from "./ZecIcon";

/** A ZEC amount (given in zatoshis) with the token logo and, optionally, its USD value. */
export function Zec({
  zat,
  showUsd = false,
  decimals = 8,
  className = "",
  iconSize = 14,
}: {
  zat: number | null | undefined;
  showUsd?: boolean;
  decimals?: number;
  className?: string;
  iconSize?: number;
}) {
  const price = useZecUsd();
  if (zat == null) return <span className="text-faint">—</span>;
  const value = zat / 1e8;
  return (
    // The USD value wraps under the amount when space runs out (narrow stat tiles on phones).
    <span className={`num inline-flex max-w-full flex-wrap items-center gap-x-1 ${className}`} title={`${value.toLocaleString("en-US", { maximumFractionDigits: 8 })} ZEC`}>
      <span className="inline-flex items-center gap-1 whitespace-nowrap">
        <ZecIcon size={iconSize} />
        {value.toLocaleString("en-US", { maximumFractionDigits: decimals })}
      </span>
      {showUsd && price != null && <span className="whitespace-nowrap text-muted">({usd(value * price)})</span>}
    </span>
  );
}

/** Rounded bordered pill around an amount, as in Etherscan's latest-blocks list. */
export function ZecPill({ zat, decimals = 4 }: { zat: number | null | undefined; decimals?: number }) {
  return (
    <span className="inline-flex items-center rounded-md border border-border-strong px-2 py-0.5 text-xs">
      <Zec zat={zat} decimals={decimals} iconSize={12} />
    </span>
  );
}

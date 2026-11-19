"use client";

import { useAmountsHidden } from "./PrivacyScreen";
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
  const hidden = useAmountsHidden();
  if (zat == null) return <span className="text-faint">—</span>;
  const value = zat / 1e8;
  return (
    // The USD value wraps under the amount when space runs out (narrow stat tiles on phones).
    // `amt` marks the figures for the privacy screen; the exact value tooltip goes with it.
    <span className={`num inline-flex max-w-full flex-wrap items-center gap-x-1 ${className}`} title={hidden ? undefined : `${value.toLocaleString("en-US", { maximumFractionDigits: 8 })} ZEC`}>
      <span className="inline-flex items-center gap-1 whitespace-nowrap">
        <ZecIcon size={iconSize} />
        <span className="amt">{value.toLocaleString("en-US", { maximumFractionDigits: decimals })}</span>
      </span>
      {showUsd && price != null && <span className="amt whitespace-nowrap text-muted">({usd(value * price)})</span>}
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

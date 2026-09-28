import Link from "next/link";
import { short, usd } from "@/lib/format";
import { STATS_URL } from "@/lib/nav";
import type { BridgeEvent } from "@/lib/types";
import { ShieldIcon, SwapIcon } from "./icons";
import { TimeAgo } from "./TimeAgo";
import { Card, Empty, Pill, ZecPill } from "./ui";

const CHAINS: Record<string, string> = {
  ETH: "Ethereum", BTC: "Bitcoin", SOL: "Solana", TRON: "Tron", BASE: "Base", ARB: "Arbitrum", BSC: "BNB Chain",
  NEAR: "NEAR", POL: "Polygon", OP: "Optimism", AVAX: "Avalanche", LTC: "Litecoin", BCH: "Bitcoin Cash", XRP: "XRP",
  DOGE: "Dogecoin", DASH: "Dash", TON: "TON", SUI: "Sui", APTOS: "Aptos", STARKNET: "Starknet",
};

/** Other side of a swap: "520.18 USDT" on "Ethereum". */
function counter(e: BridgeEvent) {
  const symbol = e.counter_asset.split(".").slice(1).join(".") || e.counter_asset;
  const amount =
    e.counter_amount == null ? null : e.counter_amount.toLocaleString("en-US", { maximumSignificantDigits: 6 });
  return { label: `${amount ? `${amount} ` : ""}${symbol === "?" ? "" : symbol}`.trim() || "?", chain: CHAINS[e.counter_chain] ?? e.counter_chain };
}

/** Latest NEAR Intents swaps moving ZEC to or from Zcash. */
export function CrossChainFeed({ events }: { events: BridgeEvent[] }) {
  return (
    <Card
      pad={false}
      title="Latest Cross-Chain Swaps · NEAR Intents"
      action={
        <a href={`${STATS_URL}/ecosystem#bridges`} className="text-sm text-link hover:text-link-hover">
          Flows by chain →
        </a>
      }
    >
      {events.length === 0 ? (
        <Empty>No swaps indexed yet.</Empty>
      ) : (
        <ul className="divide-y divide-border">
          {events.map((e) => {
            const c = counter(e);
            const zec = <span className="font-medium">ZEC</span>;
            const other = (
              <span className="num">
                {c.label} <span className="text-muted">on {c.chain}</span>
              </span>
            );
            const shielded = e.address_kind === "unified" || e.address_kind === "sapling";
            const href = e.zcash_txid ? `/tx/${e.zcash_txid}` : e.external_url;
            return (
              <li key={`${e.external_url}-${e.time}`} className="grid grid-cols-[auto_1fr_auto] items-center gap-3 px-4 py-3.5 sm:grid-cols-[auto_1fr_auto_auto]">
                <span className={`grid size-11 place-items-center rounded-lg bg-surface-2 ${e.direction === "in" ? "text-good" : "text-muted"}`}>
                  <SwapIcon />
                </span>
                <div className="min-w-0 text-sm">
                  <p className="truncate">
                    {e.direction === "out" ? (
                      <>
                        {zec} <span className="text-faint">→</span> {other}
                      </>
                    ) : (
                      <>
                        {other} <span className="text-faint">→</span> {zec}
                      </>
                    )}
                  </p>
                  <p className="truncate text-xs text-muted">
                    <TimeAgo iso={e.time} />
                    {e.referral && <> · via {e.referral}</>}
                    {href && (
                      <>
                        {" · "}
                        {e.zcash_txid ? (
                          <Link href={href} className="font-mono text-link hover:text-link-hover">
                            {short(e.zcash_txid, 8, 0)}
                          </Link>
                        ) : (
                          <a href={href} target="_blank" rel="noreferrer" className="text-link hover:text-link-hover">
                            {e.status === "success" ? "details" : e.status}
                          </a>
                        )}
                      </>
                    )}
                  </p>
                </div>
                <span className="hidden sm:block">
                  {e.address_kind &&
                    (shielded ? (
                      <Pill tone="good">
                        <ShieldIcon size={12} /> {e.direction === "in" ? "To shielded" : "From shielded"}
                      </Pill>
                    ) : (
                      <Pill>Transparent</Pill>
                    ))}
                </span>
                <div className="text-right">
                  <ZecPill zat={e.amount} />
                  {e.usd != null && <p className="num mt-0.5 text-xs text-muted">{usd(e.usd)}</p>}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

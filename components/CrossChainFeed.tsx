import Link from "next/link";
import { short, usd, zec } from "@/lib/format";
import { CHAIN_NAMES, chainLogo, coinLogo } from "@/lib/logos";
import { STATS_URL } from "@/lib/nav";
import type { BridgeEvent } from "@/lib/types";
import { ArrowRightIcon, ShieldIcon } from "./icons";
import { TimeAgo } from "./TimeAgo";
import { Card, Empty, Pill, tableHead, td, th } from "./ui";

/** A token logo with its chain as a small badge; a monogram when we have no logo. */
function TokenLogo({ symbol, chain }: { symbol: string; chain: string }) {
  const token = coinLogo(symbol);
  // Native ZEC needs no Zcash badge; bridged ZEC shows its chain.
  const badge = chain === "ZEC" ? null : chainLogo(chain);
  return (
    <span className="relative inline-block size-7 shrink-0">
      {token ? (
        // eslint-disable-next-line @next/next/no-img-element -- bundled icon
        <img src={token} alt="" width={28} height={28} className="rounded-full" />
      ) : (
        <span className="grid size-7 place-items-center rounded-full bg-surface-2 text-[10px] font-semibold text-muted">{symbol.slice(0, 3)}</span>
      )}
      {badge && (
        // eslint-disable-next-line @next/next/no-img-element -- bundled icon
        <img src={badge} alt="" width={14} height={14} className="absolute -bottom-0.5 -right-0.5 rounded-full ring-2 ring-surface" />
      )}
    </span>
  );
}

function Side({ amount, symbol, chain, chainLabel }: { amount: string | null; symbol: string; chain: string; chainLabel: string }) {
  return (
    <span className="flex items-center gap-2.5">
      <TokenLogo symbol={symbol} chain={chain} />
      <span className="leading-tight">
        <span className="num block font-medium">
          {amount ?? "—"} {symbol}
        </span>
        <span className="block text-xs text-muted">{chainLabel}</span>
      </span>
    </span>
  );
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
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead className={tableHead}>
              <tr>
                <th className={th}>Age</th>
                <th className={th}>From</th>
                <th className="w-6" />
                <th className={th}>To</th>
                <th className={`${th} text-right`}>Value</th>
                <th className={th}>Zcash side</th>
                <th className={th}>Via</th>
                <th className={th}>Zcash txn</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {events.map((e) => {
                const symbol = e.counter_asset.split(".").slice(1).join(".");
                const intents = e.counter_chain === "NEAR" && symbol === "ZEC";
                const other = (
                  <Side
                    amount={e.counter_amount == null ? null : e.counter_amount.toLocaleString("en-US", { maximumSignificantDigits: 6 })}
                    symbol={symbol === "?" || !symbol ? e.counter_chain : symbol}
                    chain={e.counter_chain}
                    chainLabel={intents ? "NEAR Intents balance" : (CHAIN_NAMES[e.counter_chain] ?? e.counter_chain)}
                  />
                );
                const zcash = <Side amount={zec(e.amount, 4)} symbol="ZEC" chain="ZEC" chainLabel="Zcash" />;
                const shielded = e.address_kind === "unified" || e.address_kind === "sapling";
                return (
                  <tr key={`${e.external_url}-${e.time}`} className="hover:bg-surface-2">
                    <td className={`${td} text-muted`}>
                      <TimeAgo iso={e.time} />
                    </td>
                    <td className={td}>{e.direction === "out" ? zcash : other}</td>
                    <td className="text-faint">
                      <ArrowRightIcon />
                    </td>
                    <td className={td}>{e.direction === "out" ? other : zcash}</td>
                    <td className={`${td} num text-right`}>{e.usd != null ? usd(e.usd) : "—"}</td>
                    <td className={td}>
                      {e.address_kind == null ? (
                        <span className="text-faint">—</span>
                      ) : shielded ? (
                        <Pill tone="good">
                          <ShieldIcon size={12} /> Shielded
                        </Pill>
                      ) : e.zcash_address ? (
                        <Link href={`/address/${e.zcash_address}`} className="font-mono text-link hover:text-link-hover">
                          {short(e.zcash_address, 6, 4)}
                        </Link>
                      ) : (
                        <Pill>Transparent</Pill>
                      )}
                    </td>
                    <td className={`${td} text-muted`}>{e.referral ?? "—"}</td>
                    <td className={td}>
                      {e.zcash_txid ? (
                        <Link href={`/tx/${e.zcash_txid}`} className="font-mono text-link hover:text-link-hover">
                          {short(e.zcash_txid, 8, 0)}
                        </Link>
                      ) : e.external_url ? (
                        <a href={e.external_url} target="_blank" rel="noreferrer" className="text-link hover:text-link-hover">
                          {e.status === "success" ? "NEAR explorer ↗" : e.status}
                        </a>
                      ) : (
                        <span className="text-faint">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

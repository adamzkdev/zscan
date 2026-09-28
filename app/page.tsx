import Link from "next/link";
import type { ReactNode } from "react";
import { AuditBadge } from "@/components/AuditBadge";
import { PriceSparkline } from "@/components/charts/PriceSparkline";
import { CubeIcon, GaugeIcon, GlobeIcon, ServerIcon, ShieldIcon } from "@/components/icons";
import { LiveHome } from "@/components/LiveHome";
import { PoolBar } from "@/components/PoolBar";
import { Search } from "@/components/Search";
import { Card, Zec } from "@/components/ui";
import { ZecIcon } from "@/components/ZecIcon";
import { api, apiOrNull } from "@/lib/api";
import { hashrate, int, pct, usd } from "@/lib/format";
import type { BlockSummary, Network, PoolsCurrent, Price, Status, Supply, TxRow } from "@/lib/types";

export default async function Home() {
  const [blocks, txs, pools, net, status, price, supply] = await Promise.all([
    api<BlockSummary[]>("/v1/blocks?limit=6"),
    api<TxRow[]>("/v1/txs?limit=6"),
    apiOrNull<PoolsCurrent>("/v1/pools"),
    api<Network>("/v1/network"),
    api<Status>("/v1/status"),
    process.env.ZSCAN_NETWORK === "testnet" ? null : api<Price>("/v1/price").catch(() => null),
    api<Supply>("/v1/supply").catch(() => null),
  ]);
  if (!pools) return <Starting />;
  const iwShare = pools.pools.ironwood / (pools.pools.ironwood + pools.pools.orchard);
  const tps = net.txs_24h / 86400;

  return (
    <div className="space-y-6">
      <section className="hero-band mx-[calc(50%-50vw)] -mt-6 px-4 pb-20 pt-10">
        <div className="mx-auto grid max-w-[1400px] items-center gap-8 px-4 lg:grid-cols-[1fr_360px]">
          <div>
            <h1 className="text-xl font-medium text-white">The Zcash Blockchain Explorer</h1>
            <div className="mt-3 max-w-3xl">
              <Search variant="hero" />
            </div>
            {supply && (
              <div className="mt-3">
                <AuditBadge audit={supply.audit} onDark />
              </div>
            )}
            <p className="mt-3 text-sm text-white/65">
              Shielded supply: <span className="text-white">{pct(pools.shielded_ratio)}</span> · Ironwood pool:{" "}
              <span className="text-white">{int(Math.round(pools.pools.ironwood / 1e8))} ZEC</span>
            </p>
          </div>
          <Link
            href="/ironwood"
            className="hidden rounded-xl border border-white/10 bg-white/5 p-4 text-white backdrop-blur transition hover:bg-white/10 lg:block"
          >
            <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-white/70">
              <ShieldIcon /> NU6.3 · Ironwood
            </p>
            <p className="mt-1 font-medium">Orchard → Ironwood migration</p>
            <p className="num mt-2 text-3xl font-semibold" style={{ color: "#3ddc97" }}>
              {pct(iwShare)}
            </p>
            <div className="mt-2 flex h-2 overflow-hidden rounded-full bg-white/10">
              <div style={{ width: `${iwShare * 100}%`, background: "#1baf7a" }} />
              <div className="ml-[2px] flex-1" style={{ background: "#eb6834" }} />
            </div>
            <p className="mt-2 text-xs text-white/60">View tracker →</p>
          </Link>
        </div>
      </section>

      <section className="card relative -mt-16 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 xl:divide-x divide-border">
        <StatCol>
          <StatItem icon={<ZecIcon size={26} />} label="ZEC Price">
            {price ? (
              <>
                {usd(price.usd)}{" "}
                <span className="text-sm text-muted">@ {price.btc.toFixed(5)} BTC</span>{" "}
                <span className={`text-sm ${price.usd_24h_change >= 0 ? "text-good" : "text-bad"}`}>
                  ({price.usd_24h_change >= 0 ? "+" : ""}
                  {price.usd_24h_change.toFixed(2)}%)
                </span>
              </>
            ) : (
              "—"
            )}
          </StatItem>
          <StatItem icon={<GlobeIcon />} label="ZEC Market Cap">
            {price ? usd(price.market_cap_usd) : "—"}
          </StatItem>
        </StatCol>
        <StatCol>
          <StatItem icon={<ServerIcon />} label="Transactions (24h)" right={<span className="text-sm text-muted">{tps.toFixed(2)} TPS</span>}>
            {int(net.txs_24h)}
          </StatItem>
          <StatItem icon={<ShieldIcon size={22} />} label="Shielded Supply" right={<span className="text-sm text-muted">{pct(pools.shielded_ratio)}</span>}>
            <Zec zat={pools.shielded} decimals={0} iconSize={16} />
          </StatItem>
        </StatCol>
        <StatCol>
          <StatItem icon={<CubeIcon size={22} />} label="Last Block" right={<span className="text-sm text-muted">~{net.avg_block_time?.toFixed(0) ?? "—"}s</span>}>
            <Link href={`/block/${status.chain_tip}`} className="text-link hover:text-link-hover">
              {int(status.chain_tip)}
            </Link>
          </StatItem>
          <StatItem icon={<GaugeIcon />} label="Network Hashrate">
            {hashrate(net.solps)}
          </StatItem>
        </StatCol>
        <div className="p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">ZEC Price History in 14 Days</p>
          <PriceSparkline history={price?.history ?? []} />
        </div>
      </section>

      <LiveHome blocks={blocks} txs={txs} />

      <Card title="ZEC Supply by Pool" action={<Link href="/ironwood" className="text-sm text-link hover:text-link-hover">Ironwood tracker →</Link>}>
        <PoolBar pools={pools.pools} />
      </Card>

      {status.backfill_progress < 1 && (
        <p className="text-center text-xs text-faint">
          Indexing history since Ironwood activation · {pct(status.backfill_progress)} complete
        </p>
      )}
    </div>
  );
}

function StatCol({ children }: { children: ReactNode }) {
  return <div className="divide-y divide-border px-4 md:border-border max-md:border-b">{children}</div>;
}

function StatItem({ icon, label, children, right }: { icon: ReactNode; label: string; children: ReactNode; right?: ReactNode }) {
  return (
    <div className="flex items-center gap-3 py-4">
      <span className="grid size-8 shrink-0 place-items-center text-muted">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
        <p className="num mt-0.5 truncate text-[0.95rem]">{children}</p>
      </div>
      {right}
    </div>
  );
}

function Starting() {
  return (
    <div className="mx-auto max-w-xl py-20 text-center">
      <h1 className="text-xl font-medium">Indexing is starting</h1>
      <p className="mt-2 text-muted">ZScan is syncing with the network. The first data appears within a minute.</p>
    </div>
  );
}

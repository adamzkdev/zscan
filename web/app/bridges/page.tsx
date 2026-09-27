import type { Metadata } from "next";
import Link from "next/link";
import { StackedDaily } from "@/components/charts/StackedDaily";
import { Hash } from "@/components/Hash";
import { TimeAgo } from "@/components/TimeAgo";
import { Card, Empty, PageTitle, Pill, Stat, tableHead, td, th, Zec } from "@/components/ui";
import { apiOrNull } from "@/lib/api";
import { IndexingStarting } from "@/app/loading-state";
import { signedZec, usd, zec } from "@/lib/format";
import type { BridgeEvent, BridgesOverview, BridgeVolume } from "@/lib/types";

export const metadata: Metadata = {
  title: "Zcash Cross-chain Flows",
  description: "ZEC moving between Zcash and other chains through NEAR Intents and Maya Protocol.",
};

const NAMES: Record<string, string> = { "near-intents": "NEAR Intents", maya: "Maya Protocol" };
const WINDOWS: BridgeVolume["window"][] = ["24h", "7d", "30d", "90d"];

/** Readable side of a swap: `ETH.USDT-0XDAC…` → `USDT (ETH)`, `NEAR.zec.omft.near` → `NEAR`. */
function asset(a: string) {
  const [chain, rest = ""] = a.split(".");
  if (chain === "NEAR") return "ZEC on NEAR";
  const sym = rest.split("-")[0];
  return sym && sym !== chain ? `${sym} (${chain})` : chain;
}

function Direction({ e }: { e: BridgeEvent }) {
  const other = asset(e.counter_asset);
  return e.direction === "out" ? (
    <span className="whitespace-nowrap">
      <b>ZEC</b> → {other}
    </span>
  ) : (
    <span className="whitespace-nowrap">
      {other} → <b>ZEC</b>
    </span>
  );
}

export default async function BridgesPage() {
  const d = await apiOrNull<BridgesOverview>("/v1/bridges");
  if (!d) return <IndexingStarting />;

  const vol = (protocol: string, w: string) => d.volumes.find((v) => v.protocol === protocol && v.window === w);
  const total = (w: string, k: "zec_in" | "zec_out") => d.volumes.filter((v) => v.window === w).reduce((a, v) => a + v[k], 0);
  const protocols = [...new Set([...d.holdings.map((h) => h.protocol), ...d.volumes.map((v) => v.protocol)])];
  const days = [...new Set(d.daily.map((r) => r.day))].sort();
  const chart = days.map((day) => {
    const row: Record<string, number | string> = { day };
    for (const r of d.daily.filter((x) => x.day === day)) {
      row[`${r.protocol}_in`] = r.zec_in;
      row[`${r.protocol}_out`] = r.zec_out;
    }
    return row;
  });
  const maxChain = Math.max(1, ...d.by_chain.map((c) => c.zec_in + c.zec_out));

  return (
    <div className="space-y-4">
      <PageTitle title="Cross-chain Flows">
        ZEC moving between Zcash and other chains, as reported by each protocol: Maya Protocol swaps from its Midgard API,
        and NEAR Intents from the zec.omft.near token on NEAR. <b>In</b> means ZEC arriving on Zcash, <b>out</b> ZEC
        leaving it.
      </PageTitle>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {d.holdings.map((h) => (
          <Stat
            key={h.protocol}
            label={h.protocol === "near-intents" ? "ZEC on NEAR Intents" : `ZEC in ${h.name} pool`}
            value={h.amount != null ? `${zec(h.amount, 0)} ZEC` : "—"}
            sub={h.change_7d != null ? `${signedZec(h.change_7d, 2)} ZEC in 7 days` : h.updated_at ? "Tracking since today" : undefined}
          />
        ))}
        <Stat label="Arrived on Zcash (30d)" value={`${zec(total("30d", "zec_in"), 0)} ZEC`} accent="var(--good)" />
        <Stat label="Left Zcash (30d)" value={`${zec(total("30d", "zec_out"), 0)} ZEC`} accent="var(--pool-orchard)" />
      </div>

      <Card title="Volume by protocol" pad={false}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px]">
            <thead className={tableHead}>
              <tr>
                <th className={th}>Protocol</th>
                {WINDOWS.map((w) => (
                  <th key={w} className={`${th} text-right`}>
                    {w} in / out
                  </th>
                ))}
                <th className={`${th} text-right`}>90d USD</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {protocols.map((p) => (
                <tr key={p} className="hover:bg-surface-2">
                  <td className={td}>
                    <Link href={`/protocol/${p}`} className="text-link hover:text-link-hover">
                      {NAMES[p] ?? p}
                    </Link>
                  </td>
                  {WINDOWS.map((w) => {
                    const v = vol(p, w);
                    return (
                      <td key={w} className={`${td} num text-right`}>
                        <span className="text-good">{zec(v?.zec_in ?? 0, 0)}</span>
                        <span className="text-faint"> / </span>
                        <span className="text-bad">{zec(v?.zec_out ?? 0, 0)}</span>
                      </td>
                    );
                  })}
                  <td className={`${td} num text-right text-muted`}>{vol(p, "90d")?.usd ? usd(vol(p, "90d")!.usd!, true) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <Card title="Daily flows (90 days)">
          {chart.length ? (
            <StackedDaily
              data={chart}
              series={[
                { key: "maya_in", label: "Maya: in", color: "var(--pool-ironwood)" },
                { key: "maya_out", label: "Maya: out", color: "var(--pool-orchard)" },
                { key: "near-intents_in", label: "NEAR: in", color: "var(--pool-sapling)" },
                { key: "near-intents_out", label: "NEAR: out", color: "var(--pool-transparent)" },
              ]}
            />
          ) : (
            <Empty>No cross-chain flows recorded yet.</Empty>
          )}
        </Card>
        <Card title="By chain (90 days)" pad={false}>
          {d.by_chain.length ? (
            <ul className="divide-y divide-border">
              {d.by_chain.map((c) => (
                <li key={c.chain} className="px-4 py-3 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium">{c.chain}</span>
                    <span className="num text-xs text-muted">
                      <span className="text-good">{zec(c.zec_in, 0)}</span> in · <span className="text-bad">{zec(c.zec_out, 0)}</span> out ·{" "}
                      {c.count} swaps
                    </span>
                  </div>
                  <div className="mt-1.5 flex h-1.5 overflow-hidden rounded-full bg-surface-2">
                    <span style={{ width: `${(c.zec_in / maxChain) * 100}%`, background: "var(--good)" }} />
                    <span style={{ width: `${(c.zec_out / maxChain) * 100}%`, background: "var(--bad)" }} />
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <Empty>No flows yet.</Empty>
          )}
        </Card>
      </div>

      <Card title="Latest cross-chain transfers" pad={false}>
        {d.recent.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead className={tableHead}>
                <tr>
                  <th className={th}>Age</th>
                  <th className={th}>Swap</th>
                  <th className={`${th} text-right`}>ZEC</th>
                  <th className={`${th} text-right`}>USD</th>
                  <th className={th}>Protocol</th>
                  <th className={th}>Zcash tx</th>
                  <th className={th}>Status</th>
                  <th className={th}>Source</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {d.recent.map((e, i) => (
                  <tr key={i} className="hover:bg-surface-2">
                    <td className={`${td} text-muted`}>
                      <TimeAgo iso={e.time} />
                    </td>
                    <td className={td}>
                      <Direction e={e} />
                    </td>
                    <td className={`${td} text-right`}>
                      <Zec zat={e.amount} decimals={4} />
                    </td>
                    <td className={`${td} num text-right text-muted`}>{e.usd != null ? usd(e.usd) : "—"}</td>
                    <td className={td}>{NAMES[e.protocol] ?? e.protocol}</td>
                    <td className={td}>{e.zcash_txid ? <Hash value={e.zcash_txid} href={`/tx/${e.zcash_txid}`} /> : <span className="text-faint">—</span>}</td>
                    <td className={td}>
                      <Pill tone={e.status === "success" ? "good" : e.status === "pending" ? "warn" : "neutral"}>{e.status}</Pill>
                    </td>
                    <td className={td}>
                      {e.external_url ? (
                        <a href={e.external_url} className="text-link hover:text-link-hover" rel="noopener noreferrer">
                          {e.protocol === "maya" ? "Maya explorer" : "NearBlocks"} ↗
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty>No cross-chain transfers recorded yet.</Empty>
        )}
      </Card>

      <p className="text-xs text-muted">
        {d.since && <>Transfers recorded since {d.since.slice(0, 10)} and kept for 90 days. </>}
        NEAR Intents holdings are the total supply of zec.omft.near read from NEAR; its individual deposits and withdrawals
        come from NearBlocks and can lag. THORChain has no ZEC pool.
      </p>
    </div>
  );
}

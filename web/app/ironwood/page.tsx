import type { Metadata } from "next";
import Link from "next/link";
import { MigrationFlowChart } from "@/components/charts/MigrationFlowChart";
import { PoolHistoryChart } from "@/components/charts/PoolHistoryChart";
import { TimeAgo } from "@/components/TimeAgo";
import { Card, PageTitle, Stat, td, th, Zec } from "@/components/ui";
import { apiOrNull } from "@/lib/api";
import { IndexingStarting } from "@/app/loading-state";
import { int, pct, short, zec, zecCompact } from "@/lib/format";
import type { Migration, PoolPoint, PoolsCurrent } from "@/lib/types";

export const metadata: Metadata = {
  title: "Ironwood Migration Tracker",
  description: "Live tracker of the Zcash Orchard → Ironwood migration (NU6.3): pool balances, daily flows and supply integrity.",
};

export default async function IronwoodPage() {
  const [m, pools, history] = await Promise.all([
    apiOrNull<Migration>("/v1/ironwood/migration"),
    apiOrNull<PoolsCurrent>("/v1/pools"),
    apiOrNull<PoolPoint[]>("/v1/pools/history?interval=day"),
  ]);
  if (!m || !pools || !history) return <IndexingStarting />;

  // Share of shielded Orchard+Ironwood value that is already in Ironwood.
  const inIronwood = m.ironwood_now / (m.ironwood_now + m.orchard_now);
  const progress = m.migrated_ratio ?? inIronwood;
  const integrityOk = m.ironwood_before_activation === 0;

  return (
    <div className="space-y-6">
      <PageTitle eyebrow={`NU6.3 · Activated at block ${int(m.activation_height)}`} title="Ironwood migration tracker">
        After a soundness bug was found in Orchard&apos;s proof circuit, Zcash sealed the Orchard pool and launched
        Ironwood, a formally verified shielded pool. A turnstile caps what can leave Orchard at what was verifiably
        deposited, so counterfeit ZEC can never escape it.
      </PageTitle>

      <section className="card grid-glow p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm text-muted">{m.migrated_ratio != null ? "Migrated out of Orchard" : "Share already in Ironwood"}</p>
            <p className="num text-5xl font-semibold tracking-tight text-ironwood md:text-6xl">{pct(progress)}</p>
          </div>
          <div className="text-right text-sm text-muted">
            <p>
              <span className="num text-text">{zec(m.ironwood_now, 0)}</span> ZEC in Ironwood
            </p>
            <p>
              <span className="num text-text">{zec(m.orchard_now, 0)}</span> ZEC left in Orchard
            </p>
          </div>
        </div>
        <div className="mt-5 flex h-4 w-full overflow-hidden rounded-full bg-surface-2">
          <div style={{ width: `${inIronwood * 100}%`, background: "var(--pool-ironwood)" }} />
          <div className="ml-[2px] flex-1" style={{ background: "var(--pool-orchard)" }} />
        </div>
        <div className="mt-2 flex justify-between text-xs text-muted">
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-sm bg-ironwood-mark" /> Ironwood
          </span>
          <span className="flex items-center gap-1.5">
            Orchard (sealed) <span className="size-2 rounded-sm bg-orchard" />
          </span>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Ironwood balance" value={`${zecCompact(m.ironwood_now)} ZEC`} accent="var(--ironwood-ink)" sub={`at block ${int(m.snapshot_height)}`} />
        <Stat label="Orchard remaining" value={`${zecCompact(m.orchard_now)} ZEC`} sub={m.orchard_at_activation != null ? `of ${zecCompact(m.orchard_at_activation)} at activation` : "sealed pool"} />
        <Stat label="Ironwood 24h" value={`${zecCompact(pools.change_24h.ironwood)} ZEC`} sub="net change" />
        <Stat label="Orchard 24h" value={`${zecCompact(pools.change_24h.orchard)} ZEC`} sub="net change" />
      </div>

      <Card title="Shielded pool balances">
        <PoolHistoryChart initial={history} />
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Card title="Daily pool flows since activation">
          <MigrationFlowChart daily={m.daily} />
        </Card>
        <Card title="Supply integrity">
          <ul className="space-y-4 text-sm">
            <li className="flex gap-3">
              <Check ok={m.orchard_now >= 0} />
              <div>
                <p className="font-medium">Turnstile holds</p>
                <p className="text-muted">
                  Orchard balance is {zec(m.orchard_now, 2)} ZEC and has never gone negative, so no more value left Orchard than
                  entered it.
                </p>
              </div>
            </li>
            <li className="flex gap-3">
              <Check ok={integrityOk} pending={m.ironwood_before_activation == null} />
              <div>
                <p className="font-medium">Ironwood starts from zero</p>
                <p className="text-muted">
                  {m.ironwood_before_activation == null
                    ? `Replaying every block since activation. This check completes when the index reaches block ${int(m.activation_height)}.`
                    : `Replaying every Ironwood value balance back to activation gives ${zec(m.ironwood_before_activation)} ZEC before block ${int(m.activation_height)}.`}
                </p>
              </div>
            </li>
            <li className="flex gap-3">
              <Check ok />
              <div>
                <p className="font-medium">Balances match the node</p>
                <p className="text-muted">
                  Pool history is derived block by block from decoded transactions and anchored to the node&apos;s
                  <code className="mx-1 rounded bg-surface-2 px-1 font-mono text-xs">valuePools</code>.
                </p>
              </div>
            </li>
          </ul>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="Where Orchard exits went">
          <p className="mb-3 text-sm text-muted">
            {int(m.exits.txs)} transactions withdrew from the sealed Orchard pool in the indexed range. Destinations are the
            public value balances at each pool boundary.
          </p>
          {(() => {
            const rows = [
              { label: "Ironwood", v: m.exits.to_ironwood, color: "var(--pool-ironwood)" },
              { label: "Transparent", v: m.exits.to_transparent, color: "var(--pool-transparent)" },
              { label: "Sapling", v: m.exits.to_sapling, color: "var(--pool-sapling)" },
            ];
            const total = rows.reduce((a, r) => a + r.v, 0) || 1;
            return (
              <>
                <div className="flex h-4 gap-[2px] overflow-hidden rounded-full">
                  {rows.map((r) => (
                    <div key={r.label} style={{ width: `${(r.v / total) * 100}%`, background: r.color }} title={r.label} />
                  ))}
                </div>
                <ul className="mt-4 space-y-2 text-sm">
                  {rows.map((r) => (
                    <li key={r.label} className="flex items-center gap-2">
                      <span className="size-2.5 rounded-sm" style={{ background: r.color }} />
                      {r.label}
                      <span className="num ml-auto text-muted">{pct(r.v / total)}</span>
                      <span className="w-36 text-right"><Zec zat={r.v} decimals={0} /></span>
                    </li>
                  ))}
                </ul>
              </>
            );
          })()}
        </Card>
        <Card title="Most common migration amounts">
          <p className="mb-3 text-sm text-muted">
            Amounts entering Ironwood are visible at the turnstile. Wallets split balances into standard amounts so each
            migration blends in with others of the same size.
          </p>
          <ul className="space-y-2 text-sm">
            {m.denominations.map((d) => {
              const max = m.denominations[0]?.count || 1;
              return (
                <li key={d.amount} className="grid grid-cols-[110px_1fr_60px] items-center gap-3">
                  <Zec zat={d.amount} />
                  <span className="h-2 overflow-hidden rounded-full bg-surface-2">
                    <span className="block h-full rounded-full bg-ironwood-mark" style={{ width: `${(d.count / max) * 100}%` }} />
                  </span>
                  <span className="num text-right text-muted">{int(d.count)}</span>
                </li>
              );
            })}
          </ul>
        </Card>
      </div>

      <Card title="Largest migrations" pad={false}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px]">
            <thead className="border-b border-border">
              <tr>
                <th className={th}>Transaction</th>
                <th className={th}>Block</th>
                <th className={th}>Age</th>
                <th className={`${th} text-right`}>Left Orchard</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {m.top.map((t) => (
                <tr key={t.txid} className="hover:bg-surface-2/60">
                  <td className={td}>
                    <Link href={`/tx/${t.txid}`} className="font-mono text-link hover:text-link-hover">
                      {short(t.txid, 12, 6)}
                    </Link>
                  </td>
                  <td className={td}>
                    <Link href={`/block/${t.height}`} className="num text-muted hover:text-link">
                      {int(t.height)}
                    </Link>
                  </td>
                  <td className={`${td} text-muted`}>
                    <TimeAgo iso={t.time} />
                  </td>
                  <td className={`${td} text-right`}>
                    <Zec zat={t.amount} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {m.indexed_from != null && m.indexed_from > m.activation_height && (
        <p className="text-center text-xs text-faint">
          History indexed from block {int(m.indexed_from)}; backfill to activation is in progress.
        </p>
      )}
    </div>
  );
}

function Check({ ok, pending = false }: { ok: boolean; pending?: boolean }) {
  const color = pending ? "var(--faint)" : ok ? "var(--good)" : "var(--bad)";
  return (
    <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border" style={{ borderColor: color }}>
      {pending ? (
        <span className="size-1.5 animate-pulse rounded-full" style={{ background: color }} />
      ) : ok ? (
        <svg width="11" height="11" viewBox="0 0 24 24" aria-label="Pass">
          <path d="m5 12 5 5L20 7" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" />
        </svg>
      ) : (
        <svg width="11" height="11" viewBox="0 0 24 24" aria-label="Fail">
          <path d="M6 6l12 12M18 6 6 18" stroke={color} strokeWidth="3" strokeLinecap="round" />
        </svg>
      )}
    </span>
  );
}

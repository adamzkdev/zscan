import type { Metadata } from "next";
import Link from "next/link";
import { Countdown } from "@/components/LiveSupply";
import { Card, PageTitle, Pill } from "@/components/ui";
import { apiOrNull } from "@/lib/api";
import { IndexingStarting } from "@/app/loading-state";
import { int } from "@/lib/format";
import type { Upgrade, Upgrades } from "@/lib/types";
import { zipUrl } from "@/lib/zips";

export const metadata: Metadata = {
  title: "Zcash Network Upgrades",
  description: "Every Zcash network upgrade, the countdown to the next one and what it changes.",
};

/** What changes with an upcoming upgrade, for readers and integrators. */
const CHANGES: Record<string, string[]> = {
  Nu7: [
    "Blocks every 25 seconds instead of 75 (ZIP 218): faster confirmations, three times more blocks per day.",
    "Block subsidy divided by 3 per block, so ZEC issuance per day and the halving dates stay the same.",
    "Default transaction expiry grows from 40 to 120 blocks (still about 50 minutes).",
    "v4 transactions are no longer accepted: wallets must send v5 or v6 transactions.",
    "Network Sustainability Mechanism (ZIPs 234/235): part of every fee is removed from supply.",
  ],
};

/** The ZIP that specifies each upgrade's deployment. */
const DEPLOY_ZIP: Record<string, number> = {
  Sapling: 205,
  Blossom: 206,
  Heartwood: 250,
  Canopy: 251,
  Nu5: 252,
  Nu6: 253,
  Nu6_1: 255,
  Nu6_2: 257,
  Nu6_3: 258,
  Nu7: 259,
};

function ZipLink({ name }: { name: string }) {
  const n = DEPLOY_ZIP[name];
  if (!n) return null;
  return (
    <a href={zipUrl(n)} className="text-sm text-link hover:text-link-hover">
      ZIP {n}
    </a>
  );
}

function when(u: Upgrade) {
  if (u.eta) return u.eta;
  if (u.announced_date) return `${u.announced_date}T00:00:00Z`;
  return null;
}

export default async function UpgradesPage() {
  const data = await apiOrNull<Upgrades>("/v1/upgrades");
  if (!data) return <IndexingStarting />;
  const next = data.upgrades.find((u) => !u.activated);
  const past = data.upgrades.filter((u) => u.activated).reverse();
  const target = next ? when(next) : null;
  const changes = next ? CHANGES[next.name] : undefined;

  return (
    <div className="space-y-4">
      <PageTitle eyebrow={data.network === "testnet" ? "Testnet" : "Mainnet"} title="Network Upgrades">
        Consensus upgrades activate at a fixed block height. ZScan tracks each one before it lands.
      </PageTitle>

      {next && (
        <section className="card overflow-hidden">
          <div className="hero-band grid gap-6 p-6 text-white md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <p className="text-sm uppercase tracking-wide text-white/70">Next upgrade</p>
              <p className="mt-1 flex items-center gap-3 text-4xl font-semibold tracking-tight">
                {next.label}
                <span className="tracker-glow size-3 rounded-full bg-accent" aria-hidden />
              </p>
              {next.summary && <p className="mt-2 max-w-2xl text-white/85">{next.summary}</p>}
              {DEPLOY_ZIP[next.name] && (
                <p className="mt-2 text-sm text-white/80">
                  Specified in{" "}
                  <a href={zipUrl(DEPLOY_ZIP[next.name])} className="underline hover:text-white">
                    ZIP {DEPLOY_ZIP[next.name]}
                  </a>{" "}
                  ·{" "}
                  <Link href="/zips" className="underline hover:text-white">
                    all ZIPs
                  </Link>
                </p>
              )}
            </div>
            <div className="md:text-right">
              <p className="text-sm text-white/70">
                {next.eta ? "Activates in (projected)" : next.announced_date ? "Announced for" : "Activation height"}
              </p>
              <p className="mt-1 text-3xl font-semibold">{target ? <Countdown target={target} /> : "Not set yet"}</p>
              <p className="mt-1 text-sm text-white/80">
                {next.activation_height != null ? (
                  <>
                    Block {int(next.activation_height)} · {int(next.blocks_remaining)} blocks to go
                  </>
                ) : next.announced_date ? (
                  <>{new Date(target!).toUTCString().slice(0, 16)} · height to be confirmed</>
                ) : null}
              </p>
            </div>
          </div>
          <div className="grid gap-6 p-6 lg:grid-cols-2">
            {changes && (
              <div>
                <h2 className="mb-3 font-medium">What changes</h2>
                <ul className="space-y-2 text-sm">
                  {changes.map((c) => (
                    <li key={c} className="flex gap-2">
                      <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-link" />
                      <span>{c}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div>
              <h2 className="mb-3 font-medium">ZScan readiness</h2>
              <ul className="space-y-2 text-sm">
                <Ready ok>Block times, halving dates and upgrade countdowns switch to {next.target_block_time}s blocks at activation</Ready>
                <Ready ok>Pending-transaction and finality estimates follow the new block time</Ready>
                <Ready ok>Fee removal tracked for every block and reconciled against the node</Ready>
                <Ready ok={false}>
                  New per-block issuance rules arrive with Zebra&apos;s {next.label} release. Until then, issuance
                  after activation is shown as pending, never guessed
                </Ready>
                {data.network === "mainnet" && (
                  <Ready ok>
                    Testnet explorer follows the {next.label} testnet first at{" "}
                    <a href="https://testnet.zscan.cash/upgrades" className="text-link hover:text-link-hover">
                      testnet.zscan.cash
                    </a>
                  </Ready>
                )}
              </ul>
            </div>
          </div>
        </section>
      )}

      <Card title="History" pad={false}>
        <ol className="relative px-4 py-2">
          {past.map((u, i) => (
            <li key={u.name} className="relative flex gap-4 py-3">
              <div className="flex flex-col items-center">
                <span className={`mt-1.5 size-3 rounded-full ${i === 0 ? "bg-good" : "bg-border-strong"}`} />
                {i < past.length - 1 && <span className="mt-1 w-px flex-1 bg-border" />}
              </div>
              <div className="min-w-0 flex-1 pb-1">
                <p className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{u.label}</span>
                  {i === 0 && <Pill tone="good">Current</Pill>}
                  {u.activation_height != null && (
                    <Link href={`/block/${u.activation_height}`} className="num text-sm text-link hover:text-link-hover">
                      #{int(u.activation_height)}
                    </Link>
                  )}
                  {u.activated_at && <span className="text-sm text-muted">{u.activated_at.slice(0, 10)}</span>}
                  <ZipLink name={u.name} />
                </p>
                {u.summary && <p className="mt-0.5 text-sm text-muted">{u.summary}</p>}
              </div>
            </li>
          ))}
        </ol>
      </Card>
    </div>
  );
}

function Ready({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <li className="flex gap-2">
      <span className={`mt-0.5 grid size-4 shrink-0 place-items-center rounded-full text-[10px] text-white ${ok ? "bg-good" : "bg-warn"}`}>
        {ok ? "✓" : "…"}
      </span>
      <span>{children}</span>
    </li>
  );
}

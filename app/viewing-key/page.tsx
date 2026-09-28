import type { Metadata } from "next";
import { Card, PageTitle } from "@/components/ui";
import { ViewingKeyExplorer } from "@/components/ViewingKey";
import { api } from "@/lib/api";
import { int } from "@/lib/format";
import type { Upgrades } from "@/lib/types";

export const metadata: Metadata = {
  title: "Viewing Key Explorer",
  description: "See the shielded balance and history of a Zcash viewing key. Decrypted in your browser: the key never leaves it.",
};

/** Where Ironwood (NU6.3) starts, when the upgrade list does not give it. */
const NU6_3_MAINNET = 3_428_143;

export default async function ViewingKeyPage() {
  const network = process.env.ZSCAN_NETWORK === "testnet" ? "testnet" : "mainnet";
  const [status, upgrades] = await Promise.all([
    api<{ chain_tip: number }>("/v1/status"),
    api<Upgrades>("/v1/upgrades").catch(() => null),
  ]);
  const tip = status.chain_tip;
  const nu63 = upgrades?.upgrades.find((u) => u.name === "Nu6_3")?.activation_height ?? (network === "mainnet" ? NU6_3_MAINNET : 1);
  const nu7 = upgrades?.upgrades.find((u) => u.name === "Nu7");
  // Blocks per day: 1,152 at 75 s, 3,456 once NU7 (25 s blocks) is active.
  const perDay = nu7?.activated ? 3456 : 1152;
  const back = (days: number) => Math.max(1, tip - days * perDay);
  const presets = [
    { label: "Last 7 days", height: back(7) },
    { label: "Last 30 days", height: back(30) },
    { label: "Last 90 days", height: back(90) },
    { label: `Since Ironwood (NU6.3, #${int(nu63)})`, height: nu63 },
  ];

  return (
    <div className="space-y-4">
      <PageTitle eyebrow={network === "testnet" ? "Testnet" : undefined} title="Viewing Key Explorer">
        Paste a viewing key to see its shielded balance and transaction history across Sapling, Orchard and Ironwood. Decryption
        runs in your browser with WebAssembly: <b className="text-text">the key is never sent to ZScan</b>, only the public blocks
        are downloaded.
      </PageTitle>

      <ViewingKeyExplorer tip={tip} network={network} presets={presets} />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Is it safe?">
          <ul className="list-disc space-y-1.5 pl-5 text-sm text-muted">
            <li>
              A viewing key <b className="text-text">cannot move funds</b>. It only reveals activity, so share it only with people
              you trust.
            </li>
            <li>
              <b className="text-bad">Never paste a seed phrase or a spending key</b> here or anywhere. ZScan refuses them.
            </li>
            <li>The key stays in this tab&apos;s memory and is gone when you close it or press &ldquo;Forget key&rdquo;.</li>
            <li>
              ZScan&apos;s server only sees which block ranges are downloaded, like any light wallet server. &ldquo;Load
              memos&rdquo; fetches the matching transactions, so the server could see which ones: it keeps no logs.
            </li>
          </ul>
        </Card>
        <Card title="Which key?">
          <ul className="list-disc space-y-1.5 pl-5 text-sm text-muted">
            <li>
              <span className="font-mono text-text">uview1…</span> Unified full viewing key: balance, received, change, spent and
              the recipients of payments you sent.
            </li>
            <li>
              <span className="font-mono text-text">uivk1…</span> Unified incoming viewing key: received payments only. Reveals
              less, good for an accountant.
            </li>
            <li>
              <span className="font-mono text-text">zxviews1…</span> Sapling extended full viewing key (older wallets).
            </li>
          </ul>
        </Card>
        <Card title="How it works">
          <ul className="list-disc space-y-1.5 pl-5 text-sm text-muted">
            <li>
              Compact blocks come from <span className="font-mono text-text">/v1/compact</span> (500 blocks per request).
            </li>
            <li>
              Several Web Workers trial-decrypt every shielded output with the key, using the same Rust crates as Zcash wallets
              (<span className="font-mono text-text">orchard</span>, <span className="font-mono text-text">sapling-crypto</span>).
            </li>
            <li>Spends are found by nullifier, memos and outgoing payments from the full transaction.</li>
            <li>Balances only count notes received in the scanned range: scan from your wallet&apos;s birthday for a full picture.</li>
          </ul>
        </Card>
      </div>
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { HeightDate } from "@/components/tools/HeightDate";
import { Panel } from "@/components/tools/ui";
import { PageTitle } from "@/components/ui";

export const metadata: Metadata = {
  title: "Zcash Network Reference",
  description: "Zcash address and key prefixes, protocol constants and a block height to date estimator.",
};

const PREFIXES: [string, string, string, string][] = [
  ["Transparent P2PKH", "t1", "tm", "Public; the usual exchange deposit address"],
  ["Transparent P2SH", "t3", "t2", "Multisig and script addresses"],
  ["TEX (ZIP-320)", "tex1", "textest1", "Transparent that refuses shielded funds (exchange compliance)"],
  ["Sapling", "zs1", "ztestsapling1", "Shielded, Sapling pool"],
  ["Unified (ZIP-316)", "u1", "utest1", "Bundles receivers: Orchard/Ironwood, Sapling, transparent"],
  ["Sprout", "zc", "zt", "Legacy shielded, can no longer receive"],
  ["Unified full viewing key", "uview1", "uviewtest1", "Sees incoming and outgoing payments, can't spend"],
  ["Unified incoming viewing key", "uivk1", "uivktest1", "Sees incoming payments only"],
];

const CONSTANTS: [string, string][] = [
  ["Smallest unit", "1 zatoshi = 0.00000001 ZEC"],
  ["Maximum supply", "21,000,000 ZEC"],
  ["Target block time", "75 s since Blossom (150 s before), 25 s with NU7"],
  ["Halving interval", "1,680,000 blocks since Blossom (about 4 years)"],
  ["Coinbase maturity", "100 blocks before a coinbase output can be spent"],
  ["Default transaction expiry", "40 blocks after the height it was built for"],
  ["Memo size", "512 bytes per shielded output"],
  ["Conventional fee (ZIP-317)", "5,000 zat per logical action, at least 2 actions"],
  ["Default P2P / RPC ports", "8233 / 8232 (testnet 18233 / 18232)"],
];

export default function NetworkPage() {
  return (
    <div className="space-y-4">
      <PageTitle eyebrow="Tools" title="Network Reference">
        Address and key prefixes, protocol constants and block times. Activation heights and consensus branch IDs are on{" "}
        <Link href="/upgrades" className="text-link hover:text-link-hover">
          Network Upgrades
        </Link>
        .
      </PageTitle>
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Block height ↔ date">
          <HeightDate spacing={75} />
        </Panel>
        <Panel title="Constants">
          <dl className="divide-y divide-border text-sm">
            {CONSTANTS.map(([k, v]) => (
              <div key={k} className="grid grid-cols-1 gap-1 py-2 sm:grid-cols-[200px_1fr]">
                <dt className="text-muted">{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
        </Panel>
      </div>
      <Panel title="Address and key prefixes">
        <div className="-mx-4 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-faint">
              <tr>
                <th className="px-4 py-2 font-medium">Type</th>
                <th className="px-4 py-2 font-medium">Mainnet</th>
                <th className="px-4 py-2 font-medium">Testnet</th>
                <th className="px-4 py-2 font-medium">Notes</th>
              </tr>
            </thead>
            <tbody>
              {PREFIXES.map(([t, m, tn, note]) => (
                <tr key={t} className="border-t border-border">
                  <td className="px-4 py-2.5">{t}</td>
                  <td className="px-4 py-2.5 font-mono">{m}…</td>
                  <td className="px-4 py-2.5 font-mono">{tn}…</td>
                  <td className="px-4 py-2.5 text-muted">{note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

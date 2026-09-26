import type { Metadata } from "next";
import Link from "next/link";
import { Hash } from "@/components/Hash";
import { Card, Empty, PageTitle, Pill, tableHead, td, th, Zec } from "@/components/ui";
import { api } from "@/lib/api";
import { categoryLabel, ORIGINS } from "@/lib/protocols";
import type { LabeledAddress } from "@/lib/types";

export const metadata: Metadata = {
  title: "Zcash Address Labels",
  description: "Every name tag on ZScan, with the public source it comes from.",
};

export default async function LabelsPage() {
  const labels = await api<LabeledAddress[]>("/v1/labels");
  return (
    <div className="space-y-4">
      <PageTitle title="Address Labels">
        Every name tag on ZScan and where it comes from. No guesswork: a label needs consensus rules, a coinbase
        signature, the protocol&apos;s own API, or a cited public source.{" "}
        <a href="https://github.com/adamzkdev/zscan/blob/main/labels/addresses.json" className="text-link hover:text-link-hover">
          Propose a label
        </a>
        .
      </PageTitle>
      <Card pad={false} title={<span className="text-sm font-normal text-muted">{labels.length} labeled addresses</span>}>
        {labels.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px]">
              <thead className={tableHead}>
                <tr>
                  <th className={th}>Address</th>
                  <th className={th}>Name</th>
                  <th className={th}>Category</th>
                  <th className={th}>Source</th>
                  <th className={`${th} text-right`}>Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {labels.map((l) => (
                  <tr key={l.address} className="hover:bg-surface-2">
                    <td className={td}>
                      <Hash value={l.address} href={`/address/${l.address}`} head={10} tail={8} />
                    </td>
                    <td className={td}>
                      {l.protocol ? (
                        <Link href={`/protocol/${l.protocol}`} className="text-link hover:text-link-hover">
                          {l.name}
                        </Link>
                      ) : (
                        l.name
                      )}
                      {!l.active && <span className="ml-2 text-xs text-muted">(retired)</span>}
                    </td>
                    <td className={td}>
                      <Pill>{categoryLabel(l.category)}</Pill>
                    </td>
                    <td className={`${td} whitespace-normal text-xs text-muted`}>
                      <span className="text-text">{ORIGINS[l.origin] ?? l.origin}</span> · {l.source}
                    </td>
                    <td className={`${td} text-right`}>
                      <Zec zat={l.balance} decimals={4} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty>Labels load a few minutes after the indexer starts.</Empty>
        )}
      </Card>
    </div>
  );
}

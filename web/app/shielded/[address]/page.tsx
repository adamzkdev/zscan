import type { Metadata } from "next";
import Link from "next/link";
import { CopyButton } from "@/components/Hash";
import { PoolIcon } from "@/components/PoolIcon";
import { Card, PageTitle, Pill, tableHead, td, th } from "@/components/ui";
import { apiOrNull } from "@/lib/api";
import type { UnifiedAddress } from "@/lib/types";

export const metadata: Metadata = { title: "Shielded address" };

export default async function ShieldedPage(props: PageProps<"/shielded/[address]">) {
  const { address } = await props.params;
  const decoded = decodeURIComponent(address);
  const ua = decoded.startsWith("u") ? await apiOrNull<UnifiedAddress>(`/v1/unified/${encodeURIComponent(decoded)}`) : null;
  const kind = ua ? "Unified Address" : decoded.startsWith("zs") ? "Sapling address" : "Shielded address";
  const transparent = ua?.receivers.find((r) => r.address);

  return (
    <div className="space-y-4">
      <PageTitle title={kind} eyebrow={ua?.network}>
        Shielded balances, amounts and counterparties are encrypted on-chain, so no explorer can show them. That&apos;s the
        point. Here&apos;s what this address reveals publicly.
      </PageTitle>
      <Card>
        <p className="flex items-start gap-2 break-all font-mono text-sm">
          {decoded} <CopyButton value={decoded} />
        </p>
      </Card>
      {ua && (
        <Card title="Receivers" pad={false}>
          <p className="border-b border-border px-4 py-3 text-sm text-muted">
            A Unified Address bundles one receiver per pool. The sender&apos;s wallet picks the most private one it supports.
          </p>
          <table className="w-full">
            <thead className={tableHead}>
              <tr>
                <th className={th}>Receiver</th>
                <th className={th}>Pays into</th>
                <th className={th}>Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {ua.receivers.map((r, i) => (
                <tr key={i}>
                  <td className={td}>
                    <span className="inline-flex items-center gap-2">
                      {r.kind === "orchard" && <PoolIcon pool="ironwood" size={16} />}
                      {r.kind === "sapling" && <PoolIcon pool="sapling" size={16} />}
                      {r.kind.startsWith("transparent") ? <Pill tone="warn">Transparent</Pill> : <Pill tone="good">Shielded</Pill>}
                    </span>
                  </td>
                  <td className={td}>{r.pools}</td>
                  <td className={`${td} font-mono text-xs`}>
                    {r.address ? (
                      <Link href={`/address/${r.address}`} className="text-link hover:text-link-hover">{r.address}</Link>
                    ) : (
                      <span className="text-muted">{r.raw.slice(0, 24)}…</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
      <Card title="What you can do">
        <ul className="list-disc space-y-2 pl-5 text-sm text-muted">
          <li>If this is your address, your wallet shows its balance and history using your keys.</li>
          <li>To prove payments to someone, share a viewing key from your wallet. It reveals incoming funds and nothing else.</li>
          {transparent ? (
            <li>
              This address includes a transparent receiver, whose activity is public:{" "}
              <Link href={`/address/${transparent.address}`} className="text-link hover:text-link-hover">view it</Link>.
            </li>
          ) : (
            <li>This address has no transparent receiver, so payments to it are always shielded.</li>
          )}
        </ul>
      </Card>
    </div>
  );
}

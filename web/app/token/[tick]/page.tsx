import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Hash } from "@/components/Hash";
import { OP_TONE } from "@/components/Inscription";
import { TimeAgo } from "@/components/TimeAgo";
import { Card, Empty, PageTitle, Pill, Rows, Stat, tableHead, td, th } from "@/components/ui";
import { apiOrNull } from "@/lib/api";
import { int, utc } from "@/lib/format";
import type { Zrc20Detail } from "@/lib/types";
import { Amount, Progress } from "@/components/Zrc20";

export async function generateMetadata(props: PageProps<"/token/[tick]">): Promise<Metadata> {
  const { tick } = await props.params;
  return { title: `${decodeURIComponent(tick).toUpperCase()} (ZRC-20)` };
}

function Addr({ a }: { a: string | null }) {
  return a ? <Hash value={a} href={`/address/${a}`} head={8} tail={6} /> : <span className="text-faint">—</span>;
}

export default async function TokenPage(props: PageProps<"/token/[tick]">) {
  const { tick } = await props.params;
  const sp = await props.searchParams;
  const page = Math.max(0, Number(sp.page) || 0);
  const invalid = sp.invalid === "1";
  const qs = new URLSearchParams({ page: String(page) });
  if (invalid) qs.set("invalid", "true");
  const t = await apiOrNull<Zrc20Detail>(`/v1/zrc20/${encodeURIComponent(tick)}?${qs}`);
  if (!t) notFound();
  const link = (p: { page?: number; invalid?: boolean }) => {
    const q = new URLSearchParams();
    if (p.page ?? page) q.set("page", String(p.page ?? page));
    if (p.invalid ?? invalid) q.set("invalid", "1");
    return `/token/${t.tick}${q.size ? `?${q}` : ""}`;
  };

  return (
    <div className="space-y-4">
      <PageTitle
        title={
          <span className="flex flex-wrap items-center gap-2">
            <span className="uppercase">{t.tick}</span>
            <Pill>ZRC-20</Pill>
          </span>
        }
      >
        Figures follow zord&apos;s rules (a mint may claim up to the limit; nothing mints past the max supply).
      </PageTitle>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Max supply" value={<Amount v={t.max} />} sub={<>Limit per mint: <Amount v={t.lim} /></>} />
        <Stat label="Minted" value={<Amount v={t.minted} />} sub={`${t.progress.toFixed(2)}% of max supply`} />
        <Stat label="Holders" value={int(t.holders)} />
        <Stat label="Mints" value={int(t.mints)} />
      </div>

      <Card title="Overview" pad={false}>
        <div className="px-4 pt-4">
          <Progress value={t.progress} />
        </div>
        <Rows
          rows={[
            ["Deployer", <Hash key="d" value={t.deployer} href={`/address/${t.deployer}`} full />],
            [
              "Deploy inscription",
              <Link key="i" href={`/inscription/${t.deploy_inscription}`} className="break-all font-mono text-xs text-link hover:text-link-hover">
                {t.deploy_inscription}
              </Link>,
            ],
            [
              "Deployed",
              <span key="t">
                <TimeAgo iso={t.time} /> <span className="text-muted">({utc(t.time)})</span> in block{" "}
                <Link href={`/block/${t.height}`} className="text-link hover:text-link-hover">{t.height}</Link>
              </span>,
            ],
            ["Decimals", String(t.dec)],
            ["Burned", <Amount key="b" v={t.burned} />, "Transfers sent without a transparent output to receive them."],
            ["Sent into shielded transactions", <Amount key="s" v={t.shielded} />, "Transfers whose inscription was spent into a shielded transaction: public tracking ends there."],
          ]}
        />
      </Card>

      <Card title="Holders" pad={false}>
        {t.holders_list.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px]">
              <thead className={tableHead}>
                <tr>
                  <th className={th}>Rank</th>
                  <th className={th}>Address</th>
                  <th className={`${th} text-right`}>Balance</th>
                  <th className={`${th} text-right`}>Committed to transfers</th>
                  <th className={`${th} text-right`}>Share</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {t.holders_list.map((h, n) => (
                  <tr key={h.address} className="hover:bg-surface-2">
                    <td className={`${td} num text-muted`}>{page * 50 + n + 1}</td>
                    <td className={td}>
                      <Hash value={h.address} href={`/address/${h.address}`} head={10} tail={8} />
                    </td>
                    <td className={`${td} num text-right`}>
                      <Amount v={h.balance} />
                    </td>
                    <td className={`${td} num text-right text-muted`}>{h.transferable === "0" ? "—" : <Amount v={h.transferable} />}</td>
                    <td className={`${td} num text-right`}>{h.share.toFixed(2)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty>No holders.</Empty>
        )}
        {(page > 0 || t.holders_list.length === 50) && (
          <div className="flex justify-end gap-2 border-t border-border px-4 py-3 text-sm">
            {page > 0 && <Link href={link({ page: page - 1 })} className="rounded-md border border-border px-3 py-1 text-link hover:bg-surface-2">‹ Prev</Link>}
            {t.holders_list.length === 50 && <Link href={link({ page: page + 1 })} className="rounded-md border border-border px-3 py-1 text-link hover:bg-surface-2">Next ›</Link>}
          </div>
        )}
      </Card>

      <Card
        title="Activity"
        pad={false}
        action={
          t.invalid_count > 0 ? (
            <Link href={link({ invalid: !invalid, page: 0 })} className="text-xs text-link hover:text-link-hover">
              {invalid ? "Hide" : "Show"} {int(t.invalid_count)} operations that did not count
            </Link>
          ) : undefined
        }
      >
        {t.events.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px]">
              <thead className={tableHead}>
                <tr>
                  <th className={th}>Operation</th>
                  <th className={`${th} text-right`}>Amount</th>
                  <th className={th}>From</th>
                  <th className={th}>To</th>
                  <th className={th}>Inscription</th>
                  <th className={th}>Age</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {t.events.map((e, n) => (
                  <tr key={n} className="hover:bg-surface-2">
                    <td className={td}>
                      <span className="flex items-center gap-2">
                        <Pill tone={e.valid ? OP_TONE[e.op] : "bad"}>{e.op}</Pill>
                        {!e.valid && <span className="text-xs text-bad">{e.reason}</span>}
                      </span>
                    </td>
                    <td className={`${td} num text-right`}>{e.amount ? <Amount v={e.amount} /> : "—"}</td>
                    <td className={td}>
                      <Addr a={e.from_addr} />
                    </td>
                    <td className={td}>
                      {e.op === "shielded" ? <span className="text-ironwood">Shielded pool</span> : <Addr a={e.to_addr} />}
                    </td>
                    <td className={td}>
                      <Link href={`/inscription/${e.inscription_id}`} className="num text-link hover:text-link-hover">
                        #{e.inscription_number != null ? int(e.inscription_number) : "?"}
                      </Link>
                    </td>
                    <td className={`${td} text-muted`}>
                      <Link href={`/tx/${e.txid}`} className="hover:text-link">
                        <TimeAgo iso={e.time} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty>No activity.</Empty>
        )}
      </Card>
    </div>
  );
}

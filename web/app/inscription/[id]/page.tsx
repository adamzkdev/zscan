import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CopyButton, Hash } from "@/components/Hash";
import { contentUrl, InscriptionPreview, inscriptionName, StatePill } from "@/components/Inscription";
import { TimeAgo } from "@/components/TimeAgo";
import { Card, Empty, PageTitle, Pill, Rows, tableHead, td, th } from "@/components/ui";
import { apiOrNull } from "@/lib/api";
import { bytes, int, short, utc } from "@/lib/format";
import type { InscriptionDetail } from "@/lib/types";

export async function generateMetadata(props: PageProps<"/inscription/[id]">): Promise<Metadata> {
  const { id } = await props.params;
  const i = await apiOrNull<InscriptionDetail>(`/v1/inscriptions/${encodeURIComponent(id)}`);
  return { title: i ? (i.name ?? `Inscription ${inscriptionName(i)}`) : "Inscription" };
}

const EVENT_LABEL = { inscribed: "Inscribed", transfer: "Transfer", shielded: "Shielded", burned: "Burned" };

function Addr({ a }: { a: string | null }) {
  return a ? <Hash value={a} href={`/address/${a}`} head={8} tail={6} /> : <span className="text-faint">—</span>;
}

export default async function InscriptionPage(props: PageProps<"/inscription/[id]">) {
  const { id } = await props.params;
  const i = await apiOrNull<InscriptionDetail>(`/v1/inscriptions/${encodeURIComponent(id)}`);
  if (!i) notFound();

  const [genesis] = i.reveal_txids;
  const owner =
    i.state === "transparent" ? (
      i.owner ? (
        <Hash value={i.owner} href={`/address/${i.owner}`} full />
      ) : (
        <span className="text-muted">Non-standard output {i.location}</span>
      )
    ) : (
      <span className="flex flex-wrap items-center gap-2">
        <StatePill state={i.state} />
        <span className="text-xs text-muted">
          {i.state === "shielded"
            ? "Spent into a shielded transaction: the owner is private and tracking ends permanently."
            : "Spent without any transparent output to carry it."}
        </span>
      </span>
    );

  return (
    <div className="space-y-4">
      <PageTitle
        title={
          <span className="flex flex-wrap items-center gap-2">
            {i.collection && i.item ? (
              <>
                <Link href={`/collection/${encodeURIComponent(i.collection)}`} className="text-link hover:text-link-hover">{i.collection}</Link>
                <span className="num">#{i.item}</span>
              </>
            ) : (
              <>
                Inscription <span className="num">#{int(i.number)}</span>
              </>
            )}
            <StatePill state={i.state} />
            {i.media === "ipfs" && <Pill tone="info">IPFS NFT</Pill>}
            {i.collection && !i.item && <Pill tone="info">Collection deploy</Pill>}
          </span>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,420px)_1fr]">
        <div className="space-y-2">
          <div className="card aspect-square overflow-hidden bg-surface-2">
            <InscriptionPreview id={i.id} media={i.media} text={i.text} hidden={i.hidden} label={inscriptionName(i)} large />
          </div>
          <div className="flex items-center justify-between text-sm">
            {i.prev ? <Link href={`/inscription/${i.prev}`} className="text-link hover:text-link-hover">‹ Previous</Link> : <span />}
            {!i.hidden && (
              <a href={contentUrl(i.id)} target="_blank" rel="noopener noreferrer" className="text-link hover:text-link-hover">
                Raw content ↗
              </a>
            )}
            {i.next ? <Link href={`/inscription/${i.next}`} className="text-link hover:text-link-hover">Next ›</Link> : <span />}
          </div>
        </div>

        <Card title="Overview" pad={false}>
          <Rows
            rows={[
              [
                "Inscription ID",
                <span key="id" className="flex items-center gap-1 break-all font-mono text-xs">
                  {i.id} <CopyButton value={i.id} />
                </span>,
                "Genesis transaction id followed by i0.",
              ],
              i.name ? ["Name", i.name] : null,
              i.collection && i.item ? ["Inscription", <span key="n" className="num">#{int(i.number)}</span>, "Sequence number among all Zcash inscriptions."] : null,
              ["Owner", owner, "Holder of the transparent output that currently carries the inscription."],
              i.location ? ["Output", <Link key="o" href={`/tx/${i.location.split(":")[0]}`} className="break-all font-mono text-xs text-link hover:text-link-hover">{i.location}</Link>, "The carrying output (txid:vout)."] : null,
              i.ipfs ? ["Image", <span key="ip" className="break-all font-mono text-xs">ipfs://{i.ipfs}</span>, "The image lives on IPFS; the chain holds a pointer to it. ZScan relays it so your browser never contacts IPFS."] : null,
              ["Content type", <span key="ct" className="font-mono">{i.content_type}</span>],
              ["Size", bytes(i.content_len)],
              ["SHA-256", <span key="h" className="break-all font-mono text-xs">{i.sha256}</span>, "Hash of the reassembled content."],
              [
                "Inscribed",
                <span key="t">
                  <TimeAgo iso={i.time} /> <span className="text-muted">({utc(i.time)})</span> in block{" "}
                  <Link href={`/block/${i.height}`} className="text-link hover:text-link-hover">{i.height}</Link>
                </span>,
              ],
              [
                "Reveal",
                <span key="r" className="flex flex-wrap items-center gap-x-2">
                  <Hash value={genesis} href={`/tx/${genesis}`} head={10} tail={8} />
                  {i.reveal_txids.length > 1 && (
                    <span className="text-muted">
                      + {i.reveal_txids.length - 1} continuation{i.reveal_txids.length > 2 ? "s" : ""}, completed in{" "}
                      <Link href={`/tx/${i.txid}`} className="font-mono text-link hover:text-link-hover">{short(i.txid, 8, 6)}</Link>
                    </span>
                  )}
                </span>,
                "Content longer than 960 bytes spans several reveal transactions, each spending the previous one.",
              ],
              ["Transfers", int(i.transfers)],
            ]}
          />
        </Card>
      </div>

      {(i.description || i.attributes.length > 0) && (
        <Card title="Properties">
          {i.description && <p className="mb-3 text-sm text-muted">{i.description}</p>}
          {i.attributes.length > 0 && (
            <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
              {i.attributes.map((a, n) => (
                <li key={n} className="rounded-lg border border-border bg-surface-2 px-3 py-2">
                  <p className="text-[11px] uppercase tracking-wide text-muted">{a.trait_type}</p>
                  <p className="text-sm font-medium">{a.value}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      {i.text && i.media !== "text" && (
        <Card title="Inscribed content">
          <pre className="overflow-x-auto whitespace-pre-wrap break-words font-mono text-xs">{i.text}</pre>
        </Card>
      )}

      <Card title="History" pad={false}>
        {i.events.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px]">
              <thead className={tableHead}>
                <tr>
                  <th className={th}>Event</th>
                  <th className={th}>Transaction</th>
                  <th className={th}>Age</th>
                  <th className={th}>From</th>
                  <th className={th}>To</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {i.events.map((e) => (
                  <tr key={e.txid} className="hover:bg-surface-2">
                    <td className={td}>
                      <Pill tone={e.kind === "inscribed" ? "good" : e.kind === "transfer" ? "neutral" : e.kind === "shielded" ? "info" : "bad"}>
                        {EVENT_LABEL[e.kind]}
                      </Pill>
                    </td>
                    <td className={td}>
                      <Hash value={e.txid} href={`/tx/${e.txid}`} head={10} tail={6} />
                    </td>
                    <td className={`${td} text-muted`}>
                      <TimeAgo iso={e.time} />
                    </td>
                    <td className={td}>
                      <Addr a={e.from_addr} />
                    </td>
                    <td className={td}>
                      {e.kind === "shielded" ? <span className="text-ironwood">Shielded pool</span> : <Addr a={e.to_addr} />}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty>No events.</Empty>
        )}
      </Card>
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CopyButton, Hash } from "@/components/Hash";
import { ArrowRightIcon, ClockIcon, ShieldIcon } from "@/components/icons";
import { InscriptionPreview, inscriptionName } from "@/components/Inscription";
import { KindBadge } from "@/components/KindBadge";
import { LiveConfirmations } from "@/components/LiveConfirmations";
import { NameTag } from "@/components/NameTag";
import { TimeAgo } from "@/components/TimeAgo";
import { TxTracker } from "@/components/TxTracker";
import { Card, PageTitle, Pill, Rows, Zec } from "@/components/ui";
import { apiOrNull } from "@/lib/api";
import { chainContext } from "@/lib/chain";
import { FINAL_CONFIRMATIONS } from "@/lib/estimate";
import { bytes, int, short, utc, zec } from "@/lib/format";
import { STREET_URL } from "@/lib/nav";
import type { Action, TxDetail } from "@/lib/types";

export async function generateMetadata(props: PageProps<"/tx/[txid]">): Promise<Metadata> {
  const { txid } = await props.params;
  return { title: `Zcash Transaction Hash (Txhash) Details ${short(txid, 8, 6)}` };
}

const POOLS = [
  ["ironwood", "Ironwood", "var(--pool-ironwood)"],
  ["orchard", "Orchard", "var(--pool-orchard)"],
  ["sapling", "Sapling", "var(--pool-sapling)"],
  ["sprout", "Sprout", "var(--pool-sprout)"],
] as const;

/** One-line human summary, like Etherscan's "Transaction Action". */
function action(t: TxDetail) {
  const vb = t.value_balances;
  switch (t.kind) {
    case "migration":
      return <>Migrate <Zec zat={vb.orchard} /> from <b>Orchard</b> to <b>Ironwood</b></>;
    case "shielding": {
      const into = POOLS.filter(([k]) => vb[k] < 0).map(([, l]) => l).join(" + ") || "a shielded pool";
      const amt = -POOLS.reduce((s, [k]) => s + Math.min(vb[k], 0), 0);
      return <>Shield <Zec zat={amt} /> into <b>{into}</b></>;
    }
    case "deshielding": {
      const from = POOLS.filter(([k]) => vb[k] > 0).map(([, l]) => l).join(" + ") || "a shielded pool";
      return <>Unshield <Zec zat={t.transparent_out} /> from <b>{from}</b> to transparent addresses</>;
    }
    case "shielded":
      return <>Private transfer inside the shielded pools. Amount and parties are encrypted.</>;
    case "coinbase":
      return <>Block reward of <Zec zat={t.transparent_out} /> paid to the miner</>;
    case "transparent":
      return <>Transfer <Zec zat={t.transparent_out} /> between transparent addresses</>;
    default:
      return <>Transparent and shielded value flows</>;
  }
}

export default async function TxPage(props: PageProps<"/tx/[txid]">) {
  const { txid } = await props.params;
  const t = await apiOrNull<TxDetail>(`/v1/tx/${encodeURIComponent(txid)}`);
  if (!t) notFound();
  const unfinalized = t.status === "mempool" || (t.confirmations ?? 0) < FINAL_CONFIRMATIONS;
  const chain = unfinalized ? await chainContext().catch(() => null) : null;

  const shieldedCount = t.sapling_spends.length + t.sapling_outputs.length + t.orchard_actions.length + t.ironwood_actions.length + t.joinsplits;
  const from = t.inputs.find((i) => i.address)?.address;
  const to = t.outputs.find((o) => o.address)?.address;

  return (
    <div className="space-y-4">
      <PageTitle title="Transaction Details" />
      {chain && <TxTracker key={t.txid} initial={t} chain={chain} />}
      <Card pad={false}>
        <Rows
          rows={[
            [
              "Transaction Hash",
              <span key="h" className="inline-flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="inline-flex items-center gap-1.5 break-all font-mono">{t.txid}<CopyButton value={t.txid} /></span>
                <a href={`${STREET_URL}/?tx=${t.txid}`} target="_blank" rel="noopener" className="whitespace-nowrap text-xs text-link hover:text-link-hover">
                  Watch it in ZStreet ↗
                </a>
              </span>,
              "A unique identifier generated whenever a transaction is executed.",
            ],
            [
              "Status",
              t.status === "mined" ? <Pill key="s" tone="good">✓ Success</Pill> : <Pill key="s" tone="warn">Pending</Pill>,
              "The status of the transaction.",
            ],
            [
              "Block",
              t.height != null ? (
                <span key="b" className="flex flex-wrap items-center gap-2">
                  <Link href={`/block/${t.height}`} className="text-link hover:text-link-hover">{t.height}</Link>
                  {unfinalized ? (
                    <LiveConfirmations height={t.height} initial={t.confirmations ?? 1} />
                  ) : (
                    <Pill>{int(t.confirmations)} Block Confirmation{t.confirmations === 1 ? "" : "s"}</Pill>
                  )}
                </span>
              ) : (
                "(Pending)"
              ),
              "Block number in which this transaction was recorded.",
            ],
            [
              "Timestamp",
              t.time ? (
                <span key="t" className="flex items-center gap-1.5">
                  <ClockIcon /> <TimeAgo iso={t.time} /> <span className="text-muted">({utc(t.time)})</span>
                </span>
              ) : (
                "—"
              ),
              "Date and time at which the transaction was mined.",
            ],
            ["Transaction Action", <span key="a" className="flex flex-wrap items-center gap-1.5"><KindBadge kind={t.kind} /> {action(t)}</span>, "Highlights what the transaction does."],
          ]}
        />
        <div className="border-t border-border" />
        <Rows
          rows={[
            [
              "From",
              t.inputs.length ? (
                from ? <span key="f" className="flex flex-wrap items-center gap-2"><Hash value={from} href={`/address/${from}`} full /><NameTag tag={t.labels[from]} /></span> : t.inputs[0].coinbase != null ? "New coins (coinbase)" : "—"
              ) : (
                <span key="f" className="inline-flex items-center gap-1.5 text-ironwood"><ShieldIcon /> Shielded pool</span>
              ),
              "The sending party. Shielded senders are not visible on-chain.",
            ],
            [
              "To",
              t.outputs.length ? (
                to ? <span key="to" className="flex flex-wrap items-center gap-2"><Hash value={to} href={`/address/${to}`} full /><NameTag tag={t.labels[to]} /></span> : "—"
              ) : (
                <span key="to" className="inline-flex items-center gap-1.5 text-ironwood"><ShieldIcon /> Shielded pool</span>
              ),
              "The receiving party. Shielded recipients are not visible on-chain.",
            ],
          ]}
        />
        <div className="border-t border-border" />
        <Rows
          rows={[
            ["Value", t.kind === "shielded" ? <span key="v" className="text-ironwood">Hidden (fully shielded)</span> : <Zec key="v" zat={t.transparent_out} showUsd />, "Transparent value transferred. Shielded amounts are encrypted."],
            ["Transaction Fee", <Zec key="f" zat={t.fee} showUsd />, "Amount paid to the miner for processing the transaction."],
          ]}
        />
        <div className="border-t border-border" />
        <Rows
          rows={[
            ["Tx Version", `v${t.version}${t.version === 6 ? " (NU6.3)" : ""}`],
            ["Size", bytes(t.size)],
            ["Expiry Height", t.expiry_height ? String(t.expiry_height) : "none"],
          ]}
        />
      </Card>

      {(t.inputs.length > 0 || t.outputs.length > 0) && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card title={`Transparent Inputs (${t.inputs.length})`} pad={false}>
            <ul className="divide-y divide-border">
              {t.inputs.map((i, n) => (
                <li key={n} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                  {i.coinbase != null ? (
                    <span className="text-muted">Coinbase (newly minted)</span>
                  ) : (
                    <div className="min-w-0">
                      {i.address ? <span className="flex flex-wrap items-center gap-2"><Hash value={i.address} href={`/address/${i.address}`} head={10} tail={8} /><NameTag tag={t.labels[i.address]} /></span> : <span className="text-faint">unknown</span>}
                      <p className="text-xs text-faint">
                        <Link href={`/tx/${i.prev_txid}`} className="font-mono hover:text-link">{short(i.prev_txid!, 8, 4)}:{i.prev_n}</Link>
                      </p>
                    </div>
                  )}
                  <Zec zat={i.value} />
                </li>
              ))}
              {!t.inputs.length && <li className="px-4 py-3 text-sm text-muted">None, funded from shielded pools.</li>}
            </ul>
          </Card>
          <Card title={`Transparent Outputs (${t.outputs.length})`} pad={false}>
            <ul className="divide-y divide-border">
              {t.outputs.map((o) => (
                <li key={o.n} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                  <div className="min-w-0">
                    {o.address ? (
                      <span className="flex flex-wrap items-center gap-2"><Hash value={o.address} href={`/address/${o.address}`} head={10} tail={8} /><NameTag tag={t.labels[o.address]} /></span>
                    ) : o.op_return != null ? (
                      <span className="block">
                        <Pill tone="info">OP_RETURN</Pill>{" "}
                        <span className="break-all font-mono text-xs">{opReturnText(o.op_return)}</span>
                      </span>
                    ) : (
                      <span className="font-mono text-xs text-faint">script {short(o.script, 8, 4)}</span>
                    )}
                    <p className="text-xs text-faint">
                      {o.spent_by ? (
                        <Link href={`/tx/${o.spent_by.txid}`} className="hover:text-link">spent in {short(o.spent_by.txid, 8, 4)}</Link>
                      ) : (
                        "unspent (within index)"
                      )}
                    </p>
                  </div>
                  <Zec zat={o.value} />
                </li>
              ))}
              {!t.outputs.length && <li className="px-4 py-3 text-sm text-muted">None, all value stays shielded.</li>}
            </ul>
          </Card>
        </div>
      )}

      {t.inscriptions.length > 0 && <TxInscriptions t={t} />}

      {shieldedCount > 0 && (
        <section id="shielded" className="scroll-mt-32 space-y-4">
          <Card title="Shielded Pools">
            <p className="mb-3 text-sm text-muted">
              Amounts, senders and recipients inside shielded pools are encrypted. Only the net value entering or leaving each pool is public.
            </p>
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {POOLS.map(([k, label, color]) => {
                const vb = t.value_balances[k];
                const n = k === "sapling" ? t.sapling_spends.length + t.sapling_outputs.length : k === "orchard" ? t.orchard_actions.length : k === "ironwood" ? t.ironwood_actions.length : t.joinsplits;
                if (!n && !vb) return null;
                return (
                  <li key={k} className="rounded-lg border border-border bg-surface-2 px-3 py-2.5">
                    <p className="flex items-center gap-1.5 text-xs text-muted">
                      <span className="size-2 rounded-sm" style={{ background: color }} /> {label} · {n}{" "}
                      {k === "sapling" ? "spends/outputs" : k === "sprout" ? "joinsplits" : n === 1 ? "action" : "actions"}
                    </p>
                    <p className="num mt-1 flex items-center gap-1 font-medium">
                      {vb < 0 ? "+" : vb > 0 ? "−" : ""}
                      <Zec zat={Math.abs(vb)} />
                    </p>
                    <p className="text-[11px] text-faint">net change to the pool</p>
                  </li>
                );
              })}
            </ul>
          </Card>
          {t.ironwood_actions.length > 0 && <ActionList title="Ironwood Actions" actions={t.ironwood_actions} />}
          {t.orchard_actions.length > 0 && <ActionList title="Orchard Actions" actions={t.orchard_actions} />}
          {t.sapling_spends.length + t.sapling_outputs.length > 0 && (
            <Card title="Sapling" pad={false}>
              <ul className="divide-y divide-border font-mono text-xs">
                {t.sapling_spends.map((n) => (
                  <li key={n} className="break-all px-4 py-2"><span className="mr-2 text-muted">nullifier</span>{n}</li>
                ))}
                {t.sapling_outputs.map((c) => (
                  <li key={c} className="break-all px-4 py-2"><span className="mr-2 text-muted">cmu</span>{c}</li>
                ))}
              </ul>
            </Card>
          )}
        </section>
      )}
      <p className="flex items-center gap-1.5 text-xs text-muted">
        <ArrowRightIcon size={12} /> Fee: {zec(t.fee)} ZEC · Transparent in {zec(t.transparent_in)} / out {zec(t.transparent_out)} ZEC
      </p>
    </div>
  );
}

/** OP_RETURN payload as text when printable, hex otherwise. */
function opReturnText(hex: string) {
  const bytes = hex.match(/../g)?.map((b) => parseInt(b, 16)) ?? [];
  const printable = bytes.length > 0 && bytes.every((b) => b >= 32 && b < 127);
  return printable ? `"${String.fromCharCode(...bytes)}"` : hex || "(empty)";
}

function ActionList({ title, actions }: { title: string; actions: Action[] }) {
  return (
    <Card title={`${title} (${actions.length})`} pad={false}>
      <p className="border-b border-border px-4 py-2 text-xs text-muted">
        Each action spends one note and creates one note. Nullifiers prevent double spends; commitments add new notes to the tree. Neither reveals amounts or addresses.
      </p>
      <ul className="divide-y divide-border font-mono text-xs">
        {actions.map((a, i) => (
          <li key={i} className="grid gap-1 px-4 py-2.5 md:grid-cols-[60px_1fr]">
            <span className="text-muted">#{i}</span>
            <div className="min-w-0 space-y-0.5 break-all">
              <p><span className="mr-2 text-faint">nullifier</span>{a.nullifier}</p>
              <p><span className="mr-2 text-faint">cmx</span>{a.cmx}</p>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}

const MOVE_LABEL = { inscribed: "Inscribed", transfer: "Moved", sale: "Sold", shielded: "Shielded", burned: "Burned" };

function TxInscriptions({ t }: { t: TxDetail }) {
  return (
    <Card title="Inscriptions" pad={false}>
      <ul className="divide-y divide-border">
        {t.inscriptions.map((i) => (
          <li key={i.id} className="flex items-center gap-3 px-4 py-3 text-sm">
            <span className="size-12 shrink-0 overflow-hidden rounded-md border border-border bg-surface-2">
              <InscriptionPreview id={i.id} media={i.media} label={inscriptionName(i)} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-2">
                <Pill tone={i.kind === "inscribed" || i.kind === "sale" ? "good" : i.kind === "transfer" ? "neutral" : i.kind === "shielded" ? "info" : "bad"}>
                  {MOVE_LABEL[i.kind]}
                </Pill>
                <Link href={`/inscription/${i.id}`} className="num font-medium text-link hover:text-link-hover">
                  {i.collection && i.item ? inscriptionName(i) : `Inscription ${inscriptionName(i)}`}
                </Link>
                {i.price != null && <Zec zat={i.price} decimals={4} />}
                <span className="font-mono text-xs text-muted">{i.content_type}</span>
              </p>
              <p className="mt-0.5 text-xs text-muted">
                {i.from_addr && <>from <Link href={`/address/${i.from_addr}`} className="font-mono hover:text-link">{short(i.from_addr, 8, 6)}</Link> </>}
                {i.kind === "shielded" ? "into the shielded pool (tracking ends)" : i.to_addr ? <>to <Link href={`/address/${i.to_addr}`} className="font-mono hover:text-link">{short(i.to_addr, 8, 6)}</Link></> : i.kind === "burned" ? "burned" : null}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}

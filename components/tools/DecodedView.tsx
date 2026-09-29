import { int, short, zec } from "@/lib/tools/format";
import type { DecodedTx } from "@/lib/tools/types";
import { CopyButton } from "./CopyButton";
import { Panel, Rows, Tag } from "./ui";

const POOL_NAMES: Record<string, string> = { transparent: "Transparent", sprout: "Sprout", sapling: "Sapling", orchard: "Orchard", ironwood: "Ironwood" };

/** OP_RETURN payload as text when it is printable UTF-8. */
function opReturnText(hex: string): string | null {
  try {
    const bytes = new Uint8Array(hex.match(/../g)?.map((b) => parseInt(b, 16)) ?? []);
    const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    return /^[\P{C}\n\t]*$/u.test(text) ? text : null;
  } catch {
    return null;
  }
}

/** Value balance of a pool: positive = value leaves the pool into the transaction. */
function balance(vb: number) {
  return (
    <span className={vb > 0 ? "text-good" : vb < 0 ? "text-bad" : ""}>
      {vb > 0 ? "+" : ""}
      {zec(vb)} ZEC
    </span>
  );
}

export function DecodedView({ d }: { d: DecodedTx }) {
  const t = d.tx;
  const status = d.mined_height ? (
    <Tag tone="good">
      Mined in block{" "}
      <a href={`/block/${d.mined_height}`} className="ml-1 underline">
        {int(d.mined_height)}
      </a>
    </Tag>
  ) : d.in_mempool ? (
    <Tag tone="warn">In the mempool</Tag>
  ) : (
    <Tag>Not seen on the network</Tag>
  );
  const transparentOut = t.outputs.reduce((s, o) => s + o.value, 0);
  const vbs = (
    [
      ["Sprout", t.sprout_vb],
      ["Sapling", t.sapling_vb],
      ["Orchard", t.orchard_vb],
      ["Ironwood", t.ironwood_vb],
    ] as const
  ).filter(([, v]) => v !== 0);

  return (
    <div className="space-y-4">
      <Panel title="Summary">
        <Rows
          rows={[
            ["Transaction ID", <span key="t" className="font-mono">{t.txid}</span>, t.txid],
            ["Status", status],
            ["Version", `v${t.version}${t.version === 6 ? " (Ironwood)" : t.version === 5 ? " (NU5)" : ""}`],
            ["Size", `${int(t.size)} bytes`],
            ["Pools", <span key="p" className="flex flex-wrap gap-1">{d.pools.map((p) => <Tag key={p}>{POOL_NAMES[p] ?? p}</Tag>)}</span>],
            ["Expiry height", t.expiry_height ? int(t.expiry_height) : "None"],
            t.lock_time > 0 && ["Lock time", int(t.lock_time)],
            ["Coinbase", t.is_coinbase ? "Yes" : "No"],
            !t.is_coinbase && ["ZIP-317 logical actions", int(d.logical_actions)],
            !t.is_coinbase && ["Conventional fee", `${zec(d.conventional_fee)} ZEC`],
            ["Transparent out", `${zec(transparentOut)} ZEC`],
            ...vbs.map(([name, v]) => [`${name} value balance`, balance(v)] as [string, React.ReactNode]),
          ]}
        />
        {vbs.length > 0 && <p className="mt-2 text-xs text-faint">A positive value balance is value leaving that shielded pool into the transaction (to transparent outputs or the fee).</p>}
      </Panel>

      {(t.inputs.length > 0 || t.outputs.length > 0) && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Panel title={`Transparent inputs (${t.inputs.length})`}>
            {t.inputs.length === 0 ? (
              <p className="text-muted">None</p>
            ) : (
              <ul className="space-y-2 font-mono text-xs">
                {t.inputs.map((i, k) =>
                  i.prev_txid ? (
                    <li key={k} className="flex items-center gap-2">
                      <span className="text-faint">#{k}</span>
                      <a href={`/tx/${i.prev_txid}`} className="text-link hover:text-link-hover">
                        {short(i.prev_txid, 12, 8)}:{i.prev_n}
                      </a>
                    </li>
                  ) : (
                    <li key={k} className="break-all">
                      <span className="text-faint">coinbase</span> {i.coinbase_data}
                    </li>
                  ),
                )}
              </ul>
            )}
          </Panel>
          <Panel title={`Transparent outputs (${t.outputs.length})`}>
            {t.outputs.length === 0 ? (
              <p className="text-muted">None</p>
            ) : (
              <ul className="space-y-2">
                {t.outputs.map((o) => {
                  const text = o.op_return ? opReturnText(o.op_return) : null;
                  return (
                    <li key={o.n} className="flex items-start justify-between gap-3">
                      <span className="min-w-0 font-mono text-xs">
                        <span className="text-faint">#{o.n} </span>
                        {o.address ? (
                          <a href={`/address/${o.address}`} className="break-all text-link hover:text-link-hover">
                            {o.address}
                          </a>
                        ) : o.op_return != null ? (
                          <span className="break-all">
                            OP_RETURN {text ? <span className="text-text">&ldquo;{text}&rdquo;</span> : o.op_return}
                          </span>
                        ) : (
                          <span className="break-all text-muted">script {o.script}</span>
                        )}
                      </span>
                      <span className="num shrink-0">{zec(o.value)} ZEC</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>
        </div>
      )}

      {(t.sapling_spends.length > 0 || t.sapling_outputs.length > 0 || t.orchard_actions.length > 0 || t.ironwood_actions.length > 0 || t.n_joinsplits > 0) && (
        <Panel title="Shielded parts">
          <p className="mb-3 text-muted">Amounts, addresses and memos stay encrypted: only nullifiers (spent notes) and note commitments (new notes) are public.</p>
          <Rows
            rows={[
              t.n_joinsplits > 0 && ["Sprout JoinSplits", int(t.n_joinsplits)],
              t.sapling_spends.length > 0 && ["Sapling spends", int(t.sapling_spends.length)],
              t.sapling_outputs.length > 0 && ["Sapling outputs", int(t.sapling_outputs.length)],
              t.orchard_actions.length > 0 && ["Orchard actions", int(t.orchard_actions.length)],
              t.ironwood_actions.length > 0 && ["Ironwood actions", int(t.ironwood_actions.length)],
            ]}
          />
          {[...t.orchard_actions.map((a) => ["Orchard", a] as const), ...t.ironwood_actions.map((a) => ["Ironwood", a] as const)].length > 0 && (
            <details className="mt-3">
              <summary className="text-sm text-link">Nullifiers and commitments</summary>
              <ul className="mt-2 space-y-1.5 font-mono text-xs text-muted">
                {[...t.orchard_actions.map((a) => ["Orchard", a] as const), ...t.ironwood_actions.map((a) => ["Ironwood", a] as const)].map(([pool, a], k) => (
                  <li key={k} className="break-all">
                    <span className="text-faint">{pool} #{k} </span>nf {a.nullifier} · cmx {a.cmx}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </Panel>
      )}

      <details className="panel p-4">
        <summary className="flex items-center justify-between text-sm text-muted">
          Raw JSON
          <CopyButton text={JSON.stringify(d, null, 2)} />
        </summary>
        <pre className="mt-3 max-h-[480px] overflow-auto font-mono text-xs text-muted">{JSON.stringify(d, null, 2)}</pre>
      </details>
    </div>
  );
}

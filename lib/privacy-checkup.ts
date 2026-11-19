import { conventionalFee } from "./estimate";
import type { TxDetail } from "./types";

/*
 * Transaction privacy checkup: what a transaction reveals on-chain, from the data its page already
 * has. A self-audit with neutral wording: it describes what is visible, it never labels anyone.
 */

/** The parts of a transaction the checkup reads (built on the server, analysed in the browser). */
export type CheckupInput = {
  kind: TxDetail["kind"];
  fee: number | null;
  transparentIn: number;
  transparentOut: number;
  vb: TxDetail["value_balances"];
  inputs: { address: string | null; value: number | null }[];
  coinbase: boolean;
  outputs: { address: string | null; value: number; opReturn: boolean }[];
  sapling: { spends: number; outputs: number };
  orchard: number;
  ironwood: number;
  joinsplits: number;
  inscriptions: number;
  labels: Record<string, { name: string; category: string; protocol: string | null }>;
};

export function checkupInput(t: TxDetail): CheckupInput {
  const addrs = new Set([...t.inputs.map((i) => i.address), ...t.outputs.map((o) => o.address)].filter(Boolean) as string[]);
  const labels: CheckupInput["labels"] = {};
  for (const a of addrs) {
    const l = t.labels[a];
    if (l) labels[a] = { name: l.name, category: l.category, protocol: l.protocol };
  }
  return {
    kind: t.kind,
    fee: t.fee,
    transparentIn: t.transparent_in,
    transparentOut: t.transparent_out,
    vb: t.value_balances,
    coinbase: t.inputs.some((i) => i.coinbase != null),
    inputs: t.inputs.filter((i) => i.coinbase == null).map((i) => ({ address: i.address, value: i.value })),
    outputs: t.outputs.map((o) => ({ address: o.address, value: o.value, opReturn: o.op_return != null })),
    sapling: { spends: t.sapling_spends.length, outputs: t.sapling_outputs.length },
    orchard: t.orchard_actions.length,
    ironwood: t.ironwood_actions.length,
    joinsplits: t.joinsplits,
    inscriptions: t.inscriptions.length,
    labels,
  };
}

/** Text with amounts (zatoshis) and addresses kept apart, so the page can format and blur them. */
export type Segment = string | { zat: number } | { addr: string };
export type Finding = { tone: "public" | "warn" | "ok"; text: Segment[] };
export type Level = "private" | "partial" | "public";
export type Checkup = { level: Level; findings: Finding[]; advice: string[] };

const POOLS = [
  ["ironwood", "Ironwood"],
  ["orchard", "Orchard"],
  ["sapling", "Sapling"],
  ["sprout", "Sprout"],
] as const;

/** Old fixed fees some wallets still pay: 0.0001 ZEC (pre-ZIP-313) and 0.00001 ZEC (ZIP-313). */
const LEGACY_FEES = [10_000, 1_000];

/** At most two decimals in ZEC (a multiple of 0.01 ZEC): looks chosen by a person. */
const isRound = (zat: number) => zat > 0 && zat % 1_000_000 === 0;

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

export function checkup(t: CheckupInput): Checkup {
  const findings: Finding[] = [];
  const advice = new Set<string>();
  const fee = t.fee ?? 0;

  const shielded = {
    ironwood: t.ironwood,
    orchard: t.orchard,
    sapling: t.sapling.spends + t.sapling.outputs,
    sprout: t.joinsplits,
  };
  const pools = POOLS.filter(([k]) => shielded[k] > 0 || t.vb[k] !== 0);
  const hasShielded = pools.length > 0;
  const tIn = t.inputs;
  const tOut = t.outputs.filter((o) => !o.opReturn);
  const hasTransparent = tIn.length > 0 || tOut.length > 0;

  // Value crossing into (vb < 0) or out of (vb > 0) each shielded pool is public.
  const entering = POOLS.filter(([k]) => t.vb[k] < 0).map(([k, l]) => ({ pool: l, zat: -t.vb[k] }));
  const leaving = POOLS.filter(([k]) => t.vb[k] > 0).map(([k, l]) => ({ pool: l, zat: t.vb[k] }));
  // A fully shielded transaction moves only its fee out of its pool: nothing else crosses.
  const feeOnly = !hasTransparent && !entering.length && leaving.length === 1 && leaving[0].zat === fee;
  const crossing = !feeOnly && (entering.length > 0 || leaving.length > 0);

  /* Transparent parts. */
  if (t.coinbase) {
    if (tOut.length) {
      findings.push({ tone: "public", text: [`Block reward paid to ${plural(tOut.length, "transparent output")}: ${tOut.length === 1 ? "the address and amount are" : "their addresses and amounts are"} public.`] });
      advice.add("Miners can receive block rewards directly at a shielded address.");
    }
  } else {
    const what = (n: number, role: string) => (n === 1 ? `the ${role} address and amount are public` : `the ${role} addresses and amounts are public`);
    if (tIn.length) findings.push({ tone: "public", text: [`${plural(tIn.length, "transparent input")}: ${what(tIn.length, "sending")}.`] });
    if (tOut.length) findings.push({ tone: "public", text: [`${plural(tOut.length, "transparent output")}: ${what(tOut.length, "receiving")}.`] });
    if (hasTransparent) advice.add("Use a wallet that shields by default and pay to shielded (unified) addresses: amounts and parties are then encrypted.");
  }

  const inAddrs = [...new Set(tIn.map((i) => i.address).filter(Boolean) as string[])];
  if (inAddrs.length > 1) {
    findings.push({ tone: "warn", text: [`Inputs come from ${inAddrs.length} different addresses: spending them together suggests they belong to one wallet.`] });
    advice.add("Avoid combining coins from several transparent addresses in one transaction; shield each one separately.");
  }

  const reused = tOut.map((o) => o.address).filter((a): a is string => !!a && inAddrs.includes(a));
  for (const a of [...new Set(reused)]) {
    findings.push({ tone: "warn", text: ["Change goes back to a sending address (", { addr: a }, "): the address is reused, so the change amount and the payment are easy to tell apart."] });
    advice.add("Use a fresh address for each payment and for change (most shielded wallets do this automatically).");
  }

  if (t.outputs.some((o) => o.opReturn)) findings.push({ tone: "warn", text: ["OP_RETURN data is stored in clear on-chain."] });
  if (t.inscriptions) findings.push({ tone: "warn", text: ["Carries an inscription: its content is public."] });

  /* Shielded parts. */
  if (hasShielded) {
    const parts = pools.map(([k, l]) => {
      if (k === "sapling") {
        const n = [t.sapling.spends && plural(t.sapling.spends, "spend"), t.sapling.outputs && plural(t.sapling.outputs, "output")].filter(Boolean);
        return n.length ? `${l} (${n.join(", ")})` : l;
      }
      if (k === "sprout") return `${l} (${plural(t.joinsplits, "JoinSplit")})`;
      return `${l} (${plural(shielded[k], "action")})`;
    });
    findings.push({ tone: "ok", text: [`Shielded parts in ${parts.join(", ")}: the amounts, senders and recipients inside are encrypted.`] });
  }

  if (crossing) {
    const text: Segment[] = ["Value crossing pool boundaries is public: "];
    const moves = [
      ...leaving.map((m) => ({ ...m, verb: "left" })),
      ...entering.map((m) => ({ ...m, verb: "entered" })),
    ];
    moves.forEach((m, i) => {
      if (i) text.push(", ");
      text.push({ zat: m.zat }, ` ZEC ${m.verb} ${m.pool}`);
    });
    text.push(".");
    findings.push({ tone: "warn", text });
  }

  // The same amount going into and out of the shielded side within this transaction: either value
  // passing straight through (transparent in = transparent out) or moving pool to pool.
  const same = (a: number, b: number) => a === b || a - fee === b;
  const passThrough = hasShielded && !t.coinbase && t.transparentIn > 0 && t.transparentOut > 0 && same(t.transparentIn, t.transparentOut);
  const poolToPool = leaving.flatMap((l) => entering.filter((e) => same(l.zat, e.zat)).map((e) => ({ from: l.pool, to: e.pool, zat: e.zat })))[0];
  if (passThrough) {
    findings.push({
      tone: "warn",
      text: ["The same amount (", { zat: t.transparentOut }, " ZEC) comes in from transparent inputs and leaves through transparent outputs: the shielded part doesn't hide the flow."],
    });
  } else if (poolToPool) {
    findings.push({
      tone: "warn",
      text: ["The same amount (", { zat: poolToPool.zat }, ` ZEC) leaves ${poolToPool.from} and enters ${poolToPool.to}: it can be followed from one pool to the other.`],
    });
  }
  if (passThrough || poolToPool) advice.add("When moving funds in or out of the shielded pool, avoid round amounts and don't move out the same amount you moved in.");

  const round = [
    ...(t.coinbase ? [] : tOut.filter((o) => isRound(o.value)).map((o) => o.value)),
    // A pool movement counts with or without the fee it carries.
    ...(crossing ? [...entering, ...leaving].map((m) => (isRound(m.zat) ? m.zat : isRound(m.zat - fee) ? m.zat - fee : 0)).filter(Boolean) : []),
  ];
  const rounds = [...new Set(round)];
  if (rounds.length) {
    const text: Segment[] = [rounds.length > 1 ? "Round amounts " : "Round amount "];
    rounds.slice(0, 3).forEach((z, i) => {
      if (i) text.push(", ");
      text.push({ zat: z }, " ZEC");
    });
    text.push(tOut.length > 1 ? ": a round value usually marks the payment, which singles out the other output as change." : ": round values are easier to match with other transactions.");
    findings.push({ tone: "warn", text });
    advice.add("When moving funds in or out of the shielded pool, avoid round amounts and don't move out the same amount you moved in.");
  }

  /* Fee (ZIP-317). Transparent sizes are assumed standard (P2PKH): one logical action each. */
  if (!t.coinbase && t.fee != null) {
    const actions =
      Math.max(tIn.length, t.outputs.length) + 2 * t.joinsplits + Math.max(t.sapling.spends, t.sapling.outputs) + t.orchard + t.ironwood;
    const conv = conventionalFee(actions);
    if (t.fee === conv) {
      findings.push({ tone: "ok", text: ["The fee is the ZIP-317 conventional fee, like most wallets pay."] });
    } else {
      const legacy = LEGACY_FEES.includes(t.fee) ? ", and matches a fixed fee older wallets used" : "";
      findings.push({
        tone: "warn",
        text: ["The fee (", { zat: t.fee }, " ZEC) differs from the ZIP-317 conventional fee (", { zat: conv }, ` ZEC)${legacy}: an unusual fee can hint at which wallet built the transaction.`],
      });
      advice.add("Use an up-to-date wallet that pays the ZIP-317 conventional fee, so the fee doesn't single out your wallet.");
    }
  }

  /* Labeled counterparties. */
  const labeled = Object.entries(t.labels);
  const bridge = labeled.find(([, l]) => l.category === "bridge" || l.protocol === "near-intents" || l.protocol === "maya");
  if (bridge) {
    const [a, l] = bridge;
    const intents = l.protocol === "near-intents";
    findings.push({
      tone: "warn",
      text: [`Involves ${intents ? "NEAR Intents" : l.name} (labeled address `, { addr: a }, "): a cross-chain swap's amount and timing can be matched on both chains."],
    });
    advice.add(
      intents
        ? "For NEAR Intents swaps, use confidential routing and a one-time, rotating deposit address (Vizor, for example, offers both)."
        : "For cross-chain swaps, prefer confidential routing and one-time deposit addresses, and swap to or from a shielded address.",
    );
  }
  const exchange = labeled.find(([, l]) => l.category === "exchange");
  if (exchange) {
    findings.push({ tone: "warn", text: [`Involves an address labeled ${exchange[1].name}: exchanges generally know who their customers are.`] });
    advice.add("Withdraw from exchanges to a shielded address.");
  }

  const level: Level = !hasShielded ? "public" : hasTransparent || crossing ? "partial" : "private";
  if (level === "private" && !advice.size) advice.add("Nothing to improve on-chain: only the fee and the pools used are visible.");

  // Most revealing first.
  const order = { public: 0, warn: 1, ok: 2 };
  findings.sort((a, b) => order[a.tone] - order[b.tone]);
  return { level, findings, advice: [...advice] };
}

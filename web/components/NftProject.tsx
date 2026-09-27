import type { CollectionRow, NftKind, ProjectInfo } from "@/lib/types";
import { Pill } from "./ui";

export const KIND_LABEL: Record<NftKind, string> = {
  inscription: "On-chain",
  marketplace: "Marketplace records",
  "zsa-testnet": "ZSA testnet",
  "other-chain": "Other chain",
  upcoming: "Not minted yet",
};

/** What ZScan can and can't verify for each kind of project. */
export const KIND_NOTE: Record<NftKind, string> = {
  inscription: "Items are Zcash inscriptions: ZScan reads them, their owners and their sales from the chain.",
  marketplace:
    "Items live in the marketplace's own records, not on the Zcash chain. Figures are as the marketplace reports them; ZScan can't verify ownership.",
  "zsa-testnet": "Items are Zcash Shielded Assets on testnet. They'll be verifiable once ZSA reaches mainnet.",
  "other-chain": "Items live on another chain. Listed here for reference; ZScan can't verify them.",
  upcoming: "The collection hasn't been minted yet.",
};

export function KindPill({ kind }: { kind: NftKind }) {
  const tone = kind === "inscription" ? "good" : kind === "marketplace" ? "info" : kind === "upcoming" ? "neutral" : "warn";
  return <Pill tone={tone}>{KIND_LABEL[kind]}</Pill>;
}

export function Badges({ c }: { c: CollectionRow }) {
  return (
    <>
      <KindPill kind={c.kind} />
      {c.onchain && <Pill>{c.onchain.kind === "zrc721" ? "ZRC-721" : "Launchpad drop"}</Pill>}
      {c.project?.confidence === "likely" && <Pill tone="warn">Identification likely</Pill>}
      {!c.project && <Pill tone="neutral">Unidentified</Pill>}
    </>
  );
}

function Ext({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1 text-xs text-text hover:text-link">
      {children} ↗
    </a>
  );
}

export function ProjectLinks({ p }: { p: ProjectInfo }) {
  return (
    <div className="flex flex-wrap gap-2">
      {p.website && <Ext href={p.website}>Website</Ext>}
      {p.x && <Ext href={p.x}>X</Ext>}
      {p.discord && <Ext href={p.discord}>Discord</Ext>}
      {p.telegram && <Ext href={p.telegram}>Telegram</Ext>}
      {p.marketplaces.map((m) => (
        <Ext key={m.url} href={m.url}>
          {m.label}
        </Ext>
      ))}
    </div>
  );
}

import type { CollectionRow, NftKind, ProjectInfo } from "@/lib/types";

/** What ZScan can and can't verify for each kind of project. */
export const KIND_NOTE: Record<NftKind, string> = {
  inscription: "Items are Zcash inscriptions: ZScan reads them, their owners and their sales from the chain.",
  marketplace:
    "Items live in the marketplace's own records, not on the Zcash chain. Figures are as the marketplace reports them; ZScan can't verify ownership.",
  "zsa-testnet": "Items are Zcash Shielded Assets on testnet. They'll be verifiable once ZSA reaches mainnet.",
  "other-chain": "Items live on another chain. Listed here for reference; ZScan can't verify them.",
  upcoming: "The collection hasn't been minted yet.",
};

const ROSETTE = "M12.00 1.00 L12.71 1.23 L13.34 1.79 L13.91 2.38 L14.48 2.73 L15.15 2.72 L15.94 2.48 L16.77 2.32 L17.50 2.47 L18.00 3.02 L18.27 3.83 L18.46 4.63 L18.79 5.21 L19.37 5.54 L20.17 5.73 L20.98 6.00 L21.53 6.50 L21.68 7.23 L21.52 8.06 L21.28 8.85 L21.27 9.52 L21.62 10.09 L22.21 10.66 L22.77 11.29 L23.00 12.00 L22.77 12.71 L22.21 13.34 L21.62 13.91 L21.27 14.48 L21.28 15.15 L21.52 15.94 L21.68 16.77 L21.53 17.50 L20.98 18.00 L20.17 18.27 L19.37 18.46 L18.79 18.79 L18.46 19.37 L18.27 20.17 L18.00 20.98 L17.50 21.53 L16.77 21.68 L15.94 21.52 L15.15 21.28 L14.48 21.27 L13.91 21.62 L13.34 22.21 L12.71 22.77 L12.00 23.00 L11.29 22.77 L10.66 22.21 L10.09 21.62 L9.52 21.27 L8.85 21.28 L8.06 21.52 L7.23 21.68 L6.50 21.53 L6.00 20.98 L5.73 20.17 L5.54 19.37 L5.21 18.79 L4.63 18.46 L3.83 18.27 L3.02 18.00 L2.47 17.50 L2.32 16.77 L2.48 15.94 L2.72 15.15 L2.73 14.48 L2.38 13.91 L1.79 13.34 L1.23 12.71 L1.00 12.00 L1.23 11.29 L1.79 10.66 L2.38 10.09 L2.73 9.52 L2.72 8.85 L2.48 8.06 L2.32 7.23 L2.47 6.50 L3.02 6.00 L3.83 5.73 L4.63 5.54 L5.21 5.21 L5.54 4.63 L5.73 3.83 L6.00 3.02 L6.50 2.47 L7.23 2.32 L8.06 2.48 L8.85 2.72 L9.52 2.73 L10.09 2.38 L10.66 1.79 L11.29 1.23Z";

/** Blue check for collections listed on ZScan: reviewed in the public registry, with sources. */
export function Verified({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" role="img" aria-label="Verified collection" className="inline-block shrink-0 align-[-0.15em]">
      <title>Verified: listed on ZScan, with public sources</title>
      <path d={ROSETTE} fill="#1d9bf0" />
      <path d="m7.6 12.3 3 3 5.8-6.4" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** A listed collection gets the blue check; nothing else is shown next to names. */
export function Badges({ c, size }: { c: CollectionRow; size?: number }) {
  return c.project ? <Verified size={size} /> : null;
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

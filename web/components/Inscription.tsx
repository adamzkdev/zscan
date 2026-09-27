import Link from "next/link";
import type { InscriptionMedia, InscriptionRow, InscriptionState } from "@/lib/types";
import { NftImage } from "./NftImage";
import { Pill } from "./ui";

export const contentUrl = (id: string) => `/v1/inscriptions/${id}/content`;
/** The picture of an NFT: inscribed image, or IPFS image relayed by the API. */
export const imageUrl = (id: string) => `/v1/inscriptions/${id}/image`;

/** `ZGODS #9963` for collection items, `#76,872` otherwise. */
export function inscriptionName(i: Pick<InscriptionRow, "number" | "collection" | "item"> & { drop_name?: string | null }) {
  if (i.collection && i.item) return `${i.collection} #${i.item}`;
  const n = `#${i.number.toLocaleString("en-US")}`;
  return i.drop_name ? `${i.drop_name} ${n}` : n;
}

/**
 * Inscribed content. Images, SVG and IPFS pictures load as images (no scripts); HTML runs in a
 * sandboxed iframe without same-origin access; the API adds a matching CSP either way.
 */
export function InscriptionPreview({
  id,
  media,
  text,
  hidden,
  label,
  large = false,
}: {
  id: string;
  media: InscriptionMedia;
  text?: string | null;
  hidden?: boolean;
  /** Shown when an IPFS image can't load. */
  label?: string;
  large?: boolean;
}) {
  const box = "flex size-full items-center justify-center overflow-hidden";
  if (hidden) return <div className={`${box} text-xs text-muted`}>Hidden</div>;
  const src = contentUrl(id);
  switch (media) {
    case "image":
    case "svg":
    case "collection":
    case "ipfs":
      return <NftImage src={imageUrl(id)} fallback={label ?? "Image unavailable"} />;
    case "html":
      return (
        <iframe
          src={src}
          title={`Inscription ${id}`}
          sandbox="allow-scripts"
          loading="lazy"
          scrolling="no"
          referrerPolicy="no-referrer"
          className={`size-full border-0 bg-white ${large ? "" : "pointer-events-none"}`}
        />
      );
    case "audio":
      return (
        <div className={box}>
          <audio controls src={src} className="w-11/12" />
        </div>
      );
    case "video":
      return <video controls={large} muted src={src} className="size-full object-contain" />;
    case "text":
    case "json":
      return (
        <pre className={`size-full overflow-hidden whitespace-pre-wrap break-words p-3 font-mono ${large ? "text-sm" : "text-[11px] leading-snug"}`}>
          {text ?? ""}
        </pre>
      );
    default:
      return <div className={`${box} font-mono text-xs text-muted`}>{media}</div>;
  }
}

export function StatePill({ state }: { state: InscriptionState }) {
  if (state === "transparent") return null;
  return state === "shielded" ? <Pill tone="info">Shielded · tracking ended</Pill> : <Pill tone="bad">Burned</Pill>;
}

/** A gallery tile. */
export function InscriptionCard({ i }: { i: InscriptionRow }) {
  const name = inscriptionName(i);
  const sub =
    i.state !== "transparent"
      ? i.state
      : i.media === "collection"
        ? `#${i.number.toLocaleString("en-US")}`
        : i.media === "ipfs"
          ? "IPFS"
          : i.content_type.split(";")[0];
  return (
    <Link href={`/inscription/${i.id}`} className="card group block overflow-hidden hover:border-link">
      <div className="aspect-square border-b border-border bg-surface-2">
        <InscriptionPreview id={i.id} media={i.media} text={i.preview} hidden={i.hidden} label={name} />
      </div>
      <div className="flex items-center justify-between gap-2 px-3 py-2">
        <span className="num truncate text-sm font-medium text-link group-hover:text-link-hover">{name}</span>
        <span className="shrink-0 truncate text-[11px] text-muted" title={i.content_type}>
          {sub}
        </span>
      </div>
    </Link>
  );
}

export function InscriptionGrid({ items, small = false }: { items: InscriptionRow[]; small?: boolean }) {
  return (
    <div
      className={`grid gap-3 ${small ? "grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8" : "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6"}`}
    >
      {items.map((i) => (
        <InscriptionCard key={i.id} i={i} />
      ))}
    </div>
  );
}

import Link from "next/link";
import type { InscriptionMedia, InscriptionRow, InscriptionState } from "@/lib/types";
import { Pill } from "./ui";

export const contentUrl = (id: string) => `/v1/inscriptions/${id}/content`;

/** A ZRC-20 body as `MINT 1,000 ZERO`, or null if it doesn't parse. */
export function zrc20Summary(text: string | null): { op: string; tick: string; amount: string | null } | null {
  if (!text) return null;
  try {
    const j = JSON.parse(text);
    if (typeof j?.tick !== "string" || typeof j?.op !== "string") return null;
    const amount = j.amt ?? j.max ?? null;
    return { op: j.op, tick: j.tick, amount: typeof amount === "string" ? amount : null };
  } catch {
    return null;
  }
}

function fmtAmount(v: string) {
  const [w, f] = v.split(".");
  const whole = /^\d+$/.test(w) ? BigInt(w).toLocaleString("en-US") : w;
  return f ? `${whole}.${f}` : whole;
}

/**
 * Inscribed content. Images and SVG load as images (no scripts); HTML runs in a sandboxed
 * iframe without same-origin access; the API adds a matching CSP either way.
 */
export function InscriptionPreview({
  id,
  media,
  text,
  hidden,
  large = false,
}: {
  id: string;
  media: InscriptionMedia;
  text?: string | null;
  hidden?: boolean;
  large?: boolean;
}) {
  const box = "flex size-full items-center justify-center overflow-hidden";
  if (hidden) return <div className={`${box} text-xs text-muted`}>Hidden</div>;
  const src = contentUrl(id);
  switch (media) {
    case "image":
    case "svg":
      // eslint-disable-next-line @next/next/no-img-element
      return <img src={src} alt="" loading="lazy" className="size-full object-contain [image-rendering:pixelated]" />;
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
    case "json": {
      const z = media === "json" || text?.trimStart().startsWith("{") ? zrc20Summary(text ?? null) : null;
      if (z && !large)
        return (
          <div className={`${box} flex-col gap-1 p-3 text-center`}>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">{z.op}</span>
            <span className="text-lg font-semibold uppercase">{z.tick}</span>
            {z.amount && <span className="num text-xs text-muted">{fmtAmount(z.amount)}</span>}
          </div>
        );
      return (
        <pre className={`size-full overflow-hidden whitespace-pre-wrap break-words p-3 font-mono ${large ? "text-sm" : "text-[11px] leading-snug"}`}>
          {text ?? ""}
        </pre>
      );
    }
    default:
      return <div className={`${box} font-mono text-xs text-muted`}>{media}</div>;
  }
}

export function StatePill({ state }: { state: InscriptionState }) {
  if (state === "transparent") return null;
  return state === "shielded" ? (
    <Pill tone="info">Shielded · tracking ended</Pill>
  ) : (
    <Pill tone="bad">Burned</Pill>
  );
}

/** A gallery tile. */
export function InscriptionCard({ i }: { i: InscriptionRow }) {
  return (
    <Link href={`/inscription/${i.id}`} className="card group block overflow-hidden hover:border-link">
      <div className="aspect-square border-b border-border bg-surface-2">
        <InscriptionPreview id={i.id} media={i.media} text={i.preview} hidden={i.hidden} />
      </div>
      <div className="flex items-center justify-between gap-2 px-3 py-2">
        <span className="num text-sm font-medium text-link group-hover:text-link-hover">#{i.number.toLocaleString("en-US")}</span>
        <span className="truncate text-[11px] text-muted" title={i.content_type}>
          {i.state === "shielded" ? "shielded" : i.state === "burned" ? "burned" : i.content_type.split(";")[0]}
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

export const OP_TONE = {
  deploy: "info",
  mint: "good",
  transfer: "warn",
  send: "neutral",
  shielded: "info",
  burn: "bad",
  invalid: "bad",
} as const;

import Link from "next/link";
import type { Tag } from "@/lib/types";

/** Etherscan-style name tag; links to the protocol page and shows the label's source on hover. */
export function NameTag({ tag }: { tag: Tag | null | undefined }) {
  if (!tag) return null;
  const cls =
    "inline-flex items-center rounded-md border border-link/30 bg-link/10 px-1.5 py-0.5 text-xs font-medium text-link whitespace-nowrap";
  const title = `${tag.name}${tag.active ? "" : " (retired)"} · source: ${tag.source}`;
  return tag.protocol ? (
    <Link href={`/protocol/${tag.protocol}`} className={`${cls} hover:bg-link/20`} title={title}>
      {tag.name}
    </Link>
  ) : (
    <span className={cls} title={title}>
      {tag.name}
    </span>
  );
}

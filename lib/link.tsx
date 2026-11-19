import type { ComponentProps } from "react";
import VinextLink from "vinext/shims/link";

/**
 * `next/link` for the whole site (vite.config.ts aliases it here): the same Link, without
 * prefetching unless a link asks for it. On Cloudflare every prefetch is a Worker request, and an
 * explorer page shows dozens of links (menus, block and transaction tables): prefetching them all
 * cost more requests than the pages themselves.
 */
export default function Link(props: ComponentProps<typeof VinextLink>) {
  return <VinextLink {...props} prefetch={props.prefetch ?? false} />;
}

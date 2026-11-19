import type { ComponentProps } from "react";
import NextLink from "next/link";

/**
 * The site's Link (every page imports it instead of `next/link`): the same Link, without
 * prefetching unless a link asks for it. An explorer page shows dozens of links (menus, block and
 * transaction tables): prefetching them all as they scroll into view cost more requests than the
 * pages themselves (on Cloudflare each was a Worker request; on our server, a render).
 */
export default function Link(props: ComponentProps<typeof NextLink>) {
  return <NextLink {...props} prefetch={props.prefetch ?? false} />;
}

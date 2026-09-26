"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useLive } from "./live";

/**
 * Re-renders the current server page whenever a new block is indexed, and shows the latest
 * block in the top bar. Every page stays live without its own subscription.
 */
export function LiveRefresh({ initialHeight }: { initialHeight: number | null }) {
  const router = useRouter();
  const [height, setHeight] = useState(initialHeight);
  const [, startTransition] = useTransition();

  useLive((e) => {
    if (e.type !== "block") return;
    setHeight(e.data.height);
    startTransition(() => router.refresh());
  });

  return (
    <span className="hidden items-center gap-1.5 whitespace-nowrap lg:inline-flex" title="Live: pages refresh on every new block">
      <span className="relative inline-flex size-2">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-good opacity-60" />
        <span className="relative inline-flex size-2 rounded-full bg-good" />
      </span>
      Live · Block <span className="num text-link">{height?.toLocaleString("en-US") ?? "—"}</span>
    </span>
  );
}

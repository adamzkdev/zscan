"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/** "Go to page" box. `base` is the current URL without its `page` parameter; pages are 1-based
 * here and 0-based in the URL. */
export function PageJump({ base, pages }: { base: string; pages: number }) {
  const router = useRouter();
  const [value, setValue] = useState("");
  return (
    <form
      className="flex items-center gap-1.5 text-xs text-muted"
      onSubmit={(e) => {
        e.preventDefault();
        const n = Math.min(Math.max(1, Math.floor(Number(value)) || 1), pages);
        const sep = base.includes("?") ? "&" : "?";
        router.push(n > 1 ? `${base}${sep}page=${n - 1}` : base, { scroll: false });
      }}
    >
      <label htmlFor="page-jump">Page</label>
      <input
        id="page-jump"
        inputMode="numeric"
        value={value}
        onChange={(e) => setValue(e.target.value.replace(/\D/g, ""))}
        placeholder="#"
        className="w-14 rounded-md border border-border bg-surface px-2 py-1 text-text"
      />
      <span>of {pages.toLocaleString("en-US")}</span>
    </form>
  );
}

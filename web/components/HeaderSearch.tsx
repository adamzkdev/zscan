"use client";

import { usePathname } from "next/navigation";
import { Search } from "./Search";

/** Compact search in the top bar, hidden on the home page where the hero search lives. */
export function HeaderSearch() {
  const path = usePathname();
  if (path === "/") return null;
  return (
    <div className="hidden w-[26rem] md:block">
      <Search />
    </div>
  );
}

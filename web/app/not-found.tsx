import Link from "next/link";
import { Search } from "@/components/Search";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl py-16 text-center">
      <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted">404</p>
      <h1 className="mt-2 text-2xl font-semibold">Nothing found on-chain</h1>
      <p className="mt-2 text-muted">
        We couldn&apos;t find that block, transaction or address. If you just broadcast it, give it a few seconds.
      </p>
      <div className="mt-6">
        <Search />
      </div>
      <Link href="/" className="mt-6 inline-block text-sm text-link hover:text-link-hover">
        ← Back to explorer
      </Link>
    </div>
  );
}

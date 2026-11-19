import type { Metadata } from "next";
import { PrivateLookup } from "@/components/PrivateLookup";
import { PageTitle } from "@/components/ui";
import { api } from "@/lib/api";

export const metadata: Metadata = {
  title: "Private Lookup",
  description: "Look up a Zcash transaction or transparent address without telling ZScan which one.",
  robots: { index: false },
};

/** The value looked up never appears in this page's URL: it stays in the browser's memory. */
export default async function PrivatePage() {
  const status = await api<{ chain_tip: number }>("/v1/status").catch(() => null);
  return (
    <div className="mx-auto max-w-4xl">
      <PageTitle title="Private Lookup">
        Look up a transaction or a transparent address with Private Information Retrieval: the answer comes from ZScan&apos;s server,
        which can&apos;t tell what you asked for.
      </PageTitle>
      <PrivateLookup tip={status?.chain_tip ?? null} />
    </div>
  );
}

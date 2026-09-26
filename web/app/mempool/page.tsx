import type { Metadata } from "next";
import { LiveMempool } from "@/components/LiveMempool";
import { PageTitle } from "@/components/ui";
import { api } from "@/lib/api";
import type { Mempool } from "@/lib/types";

export const metadata: Metadata = { title: "Mempool" };

export default async function MempoolPage() {
  const m = await api<Mempool>("/v1/mempool");
  return (
    <div className="space-y-6">
      <PageTitle eyebrow="Live" title="Mempool">
        Transactions broadcast to the network and waiting to be mined. Updates in real time.
      </PageTitle>
      <LiveMempool initial={m} />
    </div>
  );
}

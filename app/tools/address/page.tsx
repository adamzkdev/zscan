import type { Metadata } from "next";
import { AddressInspector } from "@/components/tools/AddressInspector";
import { PageTitle } from "@/components/ui";

export const metadata: Metadata = {
  title: "Zcash Address Inspector",
  description: "Validate any Zcash address and see its type, network, the pools it can receive in, memo support and, for Unified Addresses, each receiver.",
};

export default function Page() {
  return (
    <div className="space-y-4">
      <PageTitle eyebrow="Tools" title="Address Inspector">
        Validate any Zcash address and see its type, network, the pools it can receive in, memo support and, for Unified Addresses, each receiver.
      </PageTitle>
      <AddressInspector />
    </div>
  );
}

import type { Metadata } from "next";
import { FeeCalculator } from "@/components/tools/FeeCalculator";
import { PageTitle } from "@/components/ui";

export const metadata: Metadata = {
  title: "Zcash Fee Calculator (ZIP-317)",
  description: "The conventional fee from the number of inputs, outputs and actions, as wallets compute it under ZIP-317.",
};

export default function Page() {
  return (
    <div className="space-y-4">
      <PageTitle eyebrow="Tools" title="Fee Calculator">
        The conventional fee from the number of inputs, outputs and actions, as wallets compute it under ZIP-317.
      </PageTitle>
      <FeeCalculator />
    </div>
  );
}

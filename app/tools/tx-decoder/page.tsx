import type { Metadata } from "next";
import { TxDecoder } from "@/components/tools/TxDecoder";
import { PageTitle } from "@/components/ui";

export const metadata: Metadata = {
  title: "Zcash Transaction Decoder",
  description: "Paste a raw transaction to see its version, pools, transparent inputs and outputs, shielded actions, value balances and ZIP-317 fee. Nothing is broadcast.",
};

export default function Page() {
  return (
    <div className="space-y-4">
      <PageTitle eyebrow="Tools" title="Transaction Decoder">
        Paste a raw transaction to see its version, pools, transparent inputs and outputs, shielded actions, value balances and ZIP-317 fee. Nothing is broadcast.
      </PageTitle>
      <TxDecoder />
    </div>
  );
}

import type { Metadata } from "next";
import { Broadcast } from "@/components/tools/Broadcast";
import { PageTitle } from "@/components/ui";

export const metadata: Metadata = {
  title: "Broadcast a Zcash Transaction",
  description: "Check a signed raw transaction, then push it to the network. The check shows exactly what you are about to send.",
};

export default function Page() {
  return (
    <div className="space-y-4">
      <PageTitle eyebrow="Tools" title="Broadcast Transaction">
        Check a signed raw transaction, then push it to the network. The check shows exactly what you are about to send.
      </PageTitle>
      <Broadcast />
    </div>
  );
}

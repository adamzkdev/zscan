import type { Metadata } from "next";
import { PaymentUri } from "@/components/tools/PaymentUri";
import { PageTitle } from "@/components/ui";

export const metadata: Metadata = {
  title: "Zcash Payment Request (ZIP-321)",
  description: "Build a zcash: payment URI with amount, memo and label, and its QR code, for invoices, donation pages and checkouts. Or paste one to read it.",
};

export default function Page() {
  return (
    <div className="space-y-4">
      <PageTitle eyebrow="Tools" title="Payment Request">
        Build a zcash: payment URI with amount, memo and label, and its QR code, for invoices, donation pages and checkouts. Or paste one to read it.
      </PageTitle>
      <PaymentUri />
    </div>
  );
}

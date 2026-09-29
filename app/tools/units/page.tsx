import type { Metadata } from "next";
import { UnitConverter } from "@/components/tools/UnitConverter";
import { PageTitle } from "@/components/ui";

export const metadata: Metadata = {
  title: "ZEC Unit Converter",
  description: "ZEC, zatoshis and US dollars at the live ZEC price.",
};

export default function Page() {
  return (
    <div className="space-y-4">
      <PageTitle eyebrow="Tools" title="Unit Converter">
        ZEC, zatoshis and US dollars at the live ZEC price.
      </PageTitle>
      <UnitConverter />
    </div>
  );
}

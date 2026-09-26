import type { Metadata } from "next";
import { Card, PageTitle } from "@/components/ui";

export const metadata: Metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <div className="space-y-4">
      <PageTitle title="Privacy">ZScan is built for a privacy-preserving currency, and holds itself to the same standard.</PageTitle>
      <Card>
        <ul className="list-disc space-y-3 pl-5 text-sm text-muted">
          <li><b className="text-text">No IP logging.</b> The web server and API do not record visitor IP addresses or request logs.</li>
          <li><b className="text-text">No trackers, no ads, no cookies.</b> There is no analytics script, fingerprinting or third-party pixel.</li>
          <li><b className="text-text">Your theme choice stays in your browser</b> (localStorage). Nothing is sent to us.</li>
          <li><b className="text-text">Searches aren&apos;t stored.</b> Lookups are resolved and discarded.</li>
          <li><b className="text-text">Shielded data stays shielded.</b> ZScan only shows what the Zcash protocol makes public. We never try to deanonymize shielded users.</li>
          <li><b className="text-text">Open source.</b> The indexer, API and website are MIT-licensed so anyone can verify these claims or run their own instance.</li>
          <li><b className="text-text">Market data</b> (ZEC price) is fetched by our server from CoinGecko; your browser never contacts it.</li>
        </ul>
      </Card>
    </div>
  );
}

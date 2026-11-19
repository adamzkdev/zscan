import type { Metadata } from "next";
import Link from "@/lib/link";
import type { ReactNode } from "react";
import { Card, PageTitle } from "@/components/ui";

export const metadata: Metadata = { title: "Privacy Policy" };

/** Private lookups (lib/pir.ts, the zscan-pir service) are live. */
const PIR_LIVE = true;

function Item({ title, children }: { title: string; children: ReactNode }) {
  return (
    <li>
      <b className="text-text">{title}</b> {children}
    </li>
  );
}

const list = "list-disc space-y-3 pl-5 text-sm text-muted";
const link = "text-link hover:text-link-hover";

export default function PrivacyPage() {
  return (
    <div className="max-w-4xl space-y-4">
      <PageTitle title="Privacy">What ZScan sees when you use it, and what it keeps. Updated 19 November 2026.</PageTitle>

      <Card title="What we see and keep">
        <ul className={list}>
          <Item title="Website.">
            zscan.cash runs on Cloudflare Workers, with no per-request logs and no traces. Only errors are logged.
          </Item>
          <Item title="Cloudflare">
            delivers the site, so it necessarily sees your IP address. Its{" "}
            <a href="https://www.cloudflare.com/privacypolicy/" className={link} rel="noopener noreferrer">
              privacy policy
            </a>{" "}
            applies to that.
          </Item>
          <Item title="API.">
            The API&apos;s web server keeps access logs for 3 days, with no IP address, user agent, referrer or API key. Addresses, keys
            and hashes in the URLs are replaced by placeholders. The API uses your IP address only in memory, to apply rate limits.
          </Item>
          <Item title="Analytics.">
            Page views are counted with Plausible, without cookies. Addresses, hashes and keys are removed from the page address before
            it is sent. Plausible states that it doesn&apos;t store IP addresses.
          </Item>
          <Item title="No ads, no cookies.">
            Your settings (theme, currency, privacy screen) stay in your browser&apos;s local storage and are never sent to us.
          </Item>
          <Item title="Prices">
            are fetched by our server from CoinGecko, with exchange APIs as fallback. Your browser never contacts them.
          </Item>
          <Item title="Public data only.">
            ZScan shows what the Zcash protocol makes public, plus address labels that cite public sources. The website&apos;s{" "}
            <a href="https://github.com/adamzkdev/zscan" className={link} rel="noopener noreferrer">
              source code
            </a>{" "}
            is open (MIT).
          </Item>
        </ul>
      </Card>

      <Card title="Privacy features">
        <ul className={list}>
          {PIR_LIVE && (
            <Item title="Private lookups.">
              With <i>Private</i> on in the search bar, a transaction or transparent address is looked up with Private Information
              Retrieval: your browser sends an encrypted query and our server computes the answer over its whole database, so it never
              learns which transaction or address you asked about. It does see that a private lookup happened, when, and from which IP
              address. The value you look up is never put in a URL. Results come from a snapshot of the chain, shown with its height; addresses
              are covered while they hold ZEC.
            </Item>
          )}
          <Item title="Viewing keys stay in your browser.">
            The <Link href="/viewing-key" className={link}>viewing key explorer</Link> decrypts with WebAssembly in your browser: the key
            is never sent to ZScan, and scanning downloads the same public blocks for everyone. Loading memos fetches the matching
            transactions, so our server then sees which transactions are requested.
          </Item>
          <Item title="Hide amounts.">
            The eye button in the header (or Shift+H) blurs amounts and balances, and addresses if you choose, for screens other people
            can see. On phones, it can also hide them whenever the phone lies face down. It only changes the display.
          </Item>
          <Item title="Privacy checkup.">
            Each transaction page lists what that transaction reveals on-chain, worked out in your browser from the data already on the
            page.
          </Item>
        </ul>
      </Card>

      <Card title="Tips">
        <ul className={list}>
          <li>Use a wallet that shields by default, and pay to shielded (unified) addresses.</li>
          <li>Don&apos;t reuse transparent addresses: use a new one for each payment and for change.</li>
          <li>When shielding and unshielding, avoid round amounts and don&apos;t take out the same amount you put in.</li>
          <li>Looking up your own addresses on any explorer links them to your IP address. Tor Browser hides it from Cloudflare and from us.</li>
        </ul>
      </Card>
    </div>
  );
}

import type { Metadata } from "next";
import { JetBrains_Mono, Roboto } from "next/font/google";
import Script from "next/script";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { PriceProvider } from "@/components/price";
import { THEME_SCRIPT } from "@/components/ThemeToggle";
import { api } from "@/lib/api";
import type { Network, Price } from "@/lib/types";
import "./globals.css";

const roboto = Roboto({ variable: "--font-roboto", subsets: ["latin"], weight: ["400", "500", "700"] });
const mono = JetBrains_Mono({ variable: "--font-mono-face", subsets: ["latin"] });

// Explorer data changes every block: render on each request.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.SITE_URL ?? "https://zscan.cash"),
  title: { default: "Zcash (ZEC) Blockchain Explorer · ZScan", template: "%s · ZScan" },
  description:
    "ZScan lets you explore and search the Zcash blockchain: blocks, transactions, addresses, shielded pools and the Orchard → Ironwood migration.",
  openGraph: { siteName: "ZScan", type: "website" },
  twitter: { card: "summary_large_image" },
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Header market data is best-effort; pages still render without it.
  // Testnet coins (TAZ) have no market value: never show a price there.
  const isTestnet = process.env.ZSCAN_NETWORK === "testnet";
  const [price, net] = await Promise.all([
    isTestnet ? null : api<Price>("/v1/price").catch(() => null),
    api<Network>("/v1/network").catch(() => null),
  ]);
  const network = process.env.ZSCAN_NETWORK === "testnet" ? "testnet" : "mainnet";
  return (
    <html lang="en" className={`${roboto.variable} ${mono.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="flex min-h-full flex-col" data-ws-url={process.env.PUBLIC_WS_URL ?? ""}>
        <Script id="theme" strategy="beforeInteractive">
          {THEME_SCRIPT}
        </Script>
        <PriceProvider usd={price?.usd ?? null}>
          <Header price={price?.usd ?? null} change={price?.usd_24h_change ?? null} solps={net?.solps ?? null} height={net?.height ?? null} network={network} />
          <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6">{children}</main>
          <Footer />
        </PriceProvider>
      </body>
    </html>
  );
}

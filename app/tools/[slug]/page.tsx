import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { AddressInspector } from "@/components/tools/AddressInspector";
import { Broadcast } from "@/components/tools/Broadcast";
import { FeeCalculator } from "@/components/tools/FeeCalculator";
import { MemoTool } from "@/components/tools/MemoTool";
import { NetworkReference } from "@/components/tools/NetworkReference";
import { PaymentUri } from "@/components/tools/PaymentUri";
import { TxDecoder } from "@/components/tools/TxDecoder";
import { UnitConverter } from "@/components/tools/UnitConverter";
import { PageTitle } from "@/components/ui";
import { TOOL_PAGES } from "@/lib/tools/list";

const TOOLS: Record<string, ReactNode> = {
  "tx-decoder": <TxDecoder />,
  broadcast: <Broadcast />,
  fees: <FeeCalculator />,
  address: <AddressInspector />,
  "payment-uri": <PaymentUri />,
  memo: <MemoTool />,
  units: <UnitConverter />,
  network: <NetworkReference />,
};

export const dynamicParams = false;
export const generateStaticParams = () => TOOL_PAGES.map((p) => ({ slug: p.slug }));

export async function generateMetadata(props: PageProps<"/tools/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const page = TOOL_PAGES.find((p) => p.slug === slug);
  return page ? { title: `Zcash ${page.title}`, description: `${page.blurb}. Free, in the browser, on the open ZScan API.` } : {};
}

export default async function ToolPage(props: PageProps<"/tools/[slug]">) {
  const { slug } = await props.params;
  const page = TOOL_PAGES.find((p) => p.slug === slug);
  if (!page) notFound();
  return (
    <div className="space-y-8">
      <div>
        <PageTitle eyebrow="Developers" title={page.title}>
          {page.blurb}.
        </PageTitle>
        <nav className="-mt-1 flex flex-wrap gap-2" aria-label="On this page">
          {page.tools.map((t) => (
            <a key={t.id} href={`#${t.id}`} className="rounded-full border border-border px-3 py-1 text-sm text-muted hover:border-border-strong hover:text-text">
              {t.title}
            </a>
          ))}
        </nav>
      </div>
      {page.tools.map((t) => (
        <section key={t.id} id={t.id} className="scroll-mt-32 space-y-3">
          <div>
            <h2 className="text-lg font-medium">{t.title}</h2>
            <p className="mt-0.5 max-w-4xl text-sm text-muted">{t.blurb}</p>
          </div>
          {TOOLS[t.id]}
        </section>
      ))}
    </div>
  );
}

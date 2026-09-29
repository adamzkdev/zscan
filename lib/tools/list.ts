export type Tool = { id: string; title: string; blurb: string };
export type ToolPage = { slug: string; title: string; blurb: string; tools: Tool[] };

/** Tool pages at /tools/<slug>, each holding several tools (anchored by id), in menu order. */
export const TOOL_PAGES: ToolPage[] = [
  {
    slug: "transactions",
    title: "Transaction Tools",
    blurb: "Decode, check and broadcast raw transactions, and compute their ZIP-317 fee",
    tools: [
      { id: "tx-decoder", title: "Transaction Decoder", blurb: "Paste a raw transaction to see its version, pools, transparent inputs and outputs, shielded actions, value balances and ZIP-317 fee. Nothing is broadcast." },
      { id: "broadcast", title: "Broadcast Transaction", blurb: "Check a signed raw transaction, then push it to the network. The check shows exactly what you are about to send." },
      { id: "fees", title: "Fee Calculator", blurb: "The conventional fee from the number of inputs, outputs and actions, as wallets compute it under ZIP-317." },
    ],
  },
  {
    slug: "payments",
    title: "Address & Payment Tools",
    blurb: "Inspect addresses, build ZIP-321 payment requests and encode memos",
    tools: [
      { id: "address", title: "Address Inspector", blurb: "Validate any Zcash address and see its type, network, the pools it can receive in, memo support and, for Unified Addresses, each receiver." },
      { id: "payment-uri", title: "Payment Request (ZIP-321)", blurb: "Build a zcash: payment URI with amount, memo and label, and its QR code, for invoices, donation pages and checkouts. Or paste one to read it." },
      { id: "memo", title: "Memo Encoder", blurb: "Turn text into memo bytes (hex, or base64url for ZIP-321) and back, within the 512-byte limit." },
    ],
  },
  {
    slug: "reference",
    title: "Units & Network Reference",
    blurb: "ZEC ↔ zatoshis ↔ USD, block height ↔ date, protocol constants and address prefixes",
    tools: [
      { id: "units", title: "Unit Converter", blurb: "ZEC, zatoshis and US dollars at the live ZEC price." },
      { id: "network", title: "Network Reference", blurb: "Block height ↔ date, protocol constants, and address and key prefixes." },
    ],
  },
];

/** The page and anchor of each former single-tool URL (/tools/<id>). */
export const TOOL_REDIRECTS = TOOL_PAGES.flatMap((p) => p.tools.map((t) => ({ id: t.id, to: `/tools/${p.slug}#${t.id}` })));

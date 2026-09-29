export type Tool = { id: string; title: string; blurb: string };
/** `menu`: developer tools sit under Developers; everyday ones under Tools. */
export type ToolPage = { slug: string; title: string; blurb: string; menu: "developers" | "tools"; tools: Tool[] };

/** Tool pages at /tools/<slug>, each holding one or more tools (anchored by id), in menu order. */
export const TOOL_PAGES: ToolPage[] = [
  {
    slug: "transactions",
    title: "Transaction Tools",
    blurb: "Decode, check and broadcast raw transactions, and encode memos",
    menu: "developers",
    tools: [
      { id: "tx-decoder", title: "Transaction Decoder", blurb: "Paste a raw transaction to see its version, pools, transparent inputs and outputs, shielded actions, value balances and ZIP-317 fee. Nothing is broadcast." },
      { id: "broadcast", title: "Broadcast Transaction", blurb: "Check a signed raw transaction, then push it to the network. The check shows exactly what you are about to send." },
      { id: "memo", title: "Memo Encoder", blurb: "Turn text into memo bytes (hex, or base64url for ZIP-321) and back, within the 512-byte limit." },
    ],
  },
  {
    slug: "units",
    title: "Units & Fees",
    blurb: "ZEC ↔ zatoshis ↔ USD, and the ZIP-317 fee of a transaction",
    menu: "developers",
    tools: [
      { id: "units", title: "Unit Converter", blurb: "ZEC, zatoshis and US dollars at the live ZEC price." },
      { id: "fees", title: "Fee Calculator", blurb: "The conventional fee from the number of inputs, outputs and actions, as wallets compute it under ZIP-317." },
    ],
  },
  {
    slug: "network",
    title: "Network Reference",
    blurb: "Block height ↔ date, protocol constants, and address and key prefixes",
    menu: "developers",
    tools: [{ id: "network", title: "Network Reference", blurb: "Block height ↔ date, protocol constants, and address and key prefixes." }],
  },
  {
    slug: "payment-request",
    title: "Payment Request",
    blurb: "Build a ZIP-321 payment request with its QR code, or read one",
    menu: "tools",
    tools: [{ id: "payment-uri", title: "Payment Request (ZIP-321)", blurb: "Build a zcash: payment URI with amount, memo and label, and its QR code, for invoices, donation pages and checkouts. Or paste one to read it." }],
  },
  {
    slug: "address",
    title: "Address Inspector",
    blurb: "Check any Zcash address before sending: type, network, pools and receivers",
    menu: "tools",
    tools: [{ id: "address", title: "Address Inspector", blurb: "Validate any Zcash address and see its type, network, the pools it can receive in, memo support and, for Unified Addresses, each receiver." }],
  },
];

const href = (p: ToolPage, t: Tool) => `/tools/${p.slug}${p.tools.length > 1 ? `#${t.id}` : ""}`;

/** Where former tool URLs now live: one-tool pages (/tools/<tool id>) and earlier groupings. */
export const TOOL_REDIRECTS: { from: string; to: string }[] = [
  ...TOOL_PAGES.flatMap((p) => p.tools.filter((t) => t.id !== p.slug).map((t) => ({ from: `/tools/${t.id}`, to: href(p, t) }))),
  { from: "/tools/payments", to: "/tools/payment-request" },
  { from: "/tools/reference", to: "/tools/units" },
];

export type Tool = { slug: string; title: string; blurb: string };

/** Tools at /tools/<slug>, in menu order. */
export const TOOLS: Tool[] = [
  { slug: "tx-decoder", title: "Transaction Decoder", blurb: "Decode a raw transaction (v1–v6, Ironwood included) without broadcasting it" },
  { slug: "broadcast", title: "Broadcast Transaction", blurb: "Check and push a signed raw transaction to the network" },
  { slug: "address", title: "Address Inspector", blurb: "Type, network, pools and receivers of any Zcash address" },
  { slug: "payment-uri", title: "Payment Request (ZIP-321)", blurb: "Build or parse a zcash: payment URI, with its QR code" },
  { slug: "memo", title: "Memo Encoder", blurb: "Text ↔ memo bytes (hex, base64url), 512-byte limit" },
  { slug: "fees", title: "Fee Calculator", blurb: "ZIP-317 conventional fee from a transaction's shape" },
  { slug: "units", title: "Unit Converter", blurb: "ZEC ↔ zatoshis ↔ USD at the live price" },
  { slug: "network", title: "Network Reference", blurb: "Address prefixes, protocol constants and a block height ↔ date estimator" },
];

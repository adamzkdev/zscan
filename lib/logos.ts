/**
 * Coin and chain logos bundled in public/logos (the same files as ZScan Stats, from CoinGecko and
 * DefiLlama, served by us so visitors never hit a third party). Missing ones fall back to a monogram.
 */
const COINS = new Set([
  "ada", "avax", "bch", "bnb", "btc", "dai", "dash", "doge", "eth", "hype", "ltc", "near", "sol",
  "sui", "ton", "trx", "usd1", "usdc", "usdt", "wbtc", "xmr", "xrp", "zec",
]);
/** Symbols as bridges name them, to the coin whose logo they wear (wrapped → underlying). */
const COIN_ALIASES: Record<string, string> = { WNEAR: "near", WETH: "eth", WSOL: "sol", WBNB: "bnb", CBBTC: "btc", "USDC.E": "usdc", USDT0: "usdt" };
/** Chain codes as bridge APIs name them (ETH, SOL…), to their logo file. */
const CHAINS: Record<string, string> = {
  ARB: "arb", AVAX: "avax", BASE: "base", BSC: "bsc", BTC: "btc", DASH: "dash", DOGE: "doge", ETH: "eth",
  LTC: "ltc", MAYA: "maya", NEAR: "near", SOL: "solana", SUI: "sui", THOR: "thor", TON: "ton", TRON: "tron",
  XRP: "xrp", ZEC: "zcash",
};
/** Chains without their own logo that wear their native coin's. */
const CHAIN_COINS: Record<string, string> = { BCH: "bch", HYPERCORE: "hype" };

export const CHAIN_NAMES: Record<string, string> = {
  ARB: "Arbitrum", AVAX: "Avalanche", BASE: "Base", BCH: "Bitcoin Cash", BSC: "BNB Chain", BTC: "Bitcoin",
  DASH: "Dash", DOGE: "Dogecoin", ETH: "Ethereum", LTC: "Litecoin", NEAR: "NEAR", OP: "Optimism",
  POL: "Polygon", SOL: "Solana", SUI: "Sui", TON: "TON", TRON: "Tron", XRP: "XRP", ZEC: "Zcash",
  APTOS: "Aptos", STARKNET: "Starknet", GNOSIS: "Gnosis", HOOD: "Robinhood Chain", MONAD: "Monad",
};

export function coinLogo(symbol: string): string | null {
  const s = symbol.trim().toUpperCase();
  const coin = COIN_ALIASES[s] ?? s.toLowerCase();
  return COINS.has(coin) ? `/logos/coins/${coin}.png` : null;
}

export function chainLogo(code: string): string | null {
  const c = code.toUpperCase();
  if (CHAINS[c]) return `/logos/chains/${CHAINS[c]}.png`;
  return CHAIN_COINS[c] ? `/logos/coins/${CHAIN_COINS[c]}.png` : null;
}

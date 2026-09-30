// Mirrors the ZScan API responses. Amounts are zatoshis.

export type TxKind =
  | "coinbase"
  | "transparent"
  | "shielding"
  | "deshielding"
  | "shielded"
  | "migration"
  | "mixed";

export interface BlockSummary {
  height: number;
  hash: string;
  time: string;
  tx_count: number;
  size: number;
  fees: number | null;
  miner: string | null;
  miner_pool: string | null;
  coinbase_value: number;
}

export interface TxRow {
  txid: string;
  height: number;
  block_index: number;
  time: string;
  kind: TxKind;
  fee: number | null;
  size: number;
  transparent_in: number;
  transparent_out: number;
  sapling_vb: number;
  orchard_vb: number;
  ironwood_vb: number;
  n_tin: number;
  n_tout: number;
  n_sapling_spends: number;
  n_sapling_outputs: number;
  n_orchard_actions: number;
  n_ironwood_actions: number;
  from_address: string | null;
  to_address: string | null;
}

export interface Price {
  usd: number;
  btc: number;
  usd_24h_change: number;
  market_cap_usd: number;
  volume_24h_usd: number;
  history: [number, number][];
  rates: Record<string, number>;
}

export interface PoolValues {
  transparent: number;
  sprout: number;
  sapling: number;
  orchard: number;
  ironwood: number;
}

export interface BlockDetail extends BlockSummary {
  prev_hash: string;
  next_hash: string | null;
  confirmations: number | null;
  coinbase_value: number;
  sapling_tree_size: number | null;
  orchard_tree_size: number | null;
  ironwood_tree_size: number | null;
  pool_deltas: PoolValues;
  txs: TxRow[];
  indexed: boolean;
}

export interface Action {
  nullifier: string;
  cmx: string;
}

export interface TxDetail {
  txid: string;
  status: "mined" | "mempool";
  height: number | null;
  block_hash: string | null;
  time: string | null;
  confirmations: number | null;
  version: number;
  size: number;
  kind: TxKind;
  fee: number | null;
  transparent_in: number;
  transparent_out: number;
  value_balances: { sprout: number; sapling: number; orchard: number; ironwood: number };
  lock_time: number;
  expiry_height: number | null;
  inputs: {
    prev_txid: string | null;
    prev_n: number | null;
    value: number | null;
    address: string | null;
    coinbase: string | null;
  }[];
  outputs: {
    n: number;
    value: number;
    address: string | null;
    script: string;
    op_return: string | null;
    spent_by: { txid: string; n: number } | null;
  }[];
  joinsplits: number;
  sapling_spends: string[];
  sapling_outputs: string[];
  orchard_actions: Action[];
  ironwood_actions: Action[];
  labels: Record<string, Tag>;
  inscriptions: TxInscription[];
}

export interface AddressDetail {
  address: string;
  label: string | null;
  tag: Tag | null;
  blocks_mined: number;
  balance: number;
  received: number;
  sent: number;
  tx_count: number;
  first_seen: string | null;
  last_seen: string | null;
  indexed_from: number | null;
  filtered_count: number;
  txs: { txid: string; height: number; time: string; kind: TxKind; delta: number }[];
}

export interface PoolsCurrent {
  height: number;
  time: string;
  pools: PoolValues;
  lockbox: number;
  supply: number;
  shielded: number;
  shielded_ratio: number;
  change_24h: PoolValues;
}

export interface PoolPoint extends PoolValues {
  time: string;
  height: number;
}

export interface Migration {
  activation_height: number;
  snapshot_height: number;
  orchard_now: number;
  ironwood_now: number;
  orchard_at_activation: number | null;
  ironwood_before_activation: number | null;
  migrated: number | null;
  migrated_ratio: number | null;
  indexed_from: number | null;
  daily: { day: string; orchard_out: number; ironwood_in: number; migration_txs: number; exit_to_ironwood: number; exit_to_sapling: number; exit_to_transparent: number }[];
  top: { txid: string; height: number; time: string; amount: number }[];
  exits: { to_ironwood: number; to_sapling: number; to_transparent: number; fees: number; txs: number };
  denominations: { amount: number; count: number }[];
}

export interface Network {
  height: number | null;
  difficulty: number | null;
  solps: number | null;
  avg_block_time: number | null;
  target_block_time: number;
  txs_24h: number;
  fees_24h: number;
  shielded_tx_ratio_24h: number;
  migrations_24h: number;
}

export interface Status {
  chain_tip: number;
  indexed_high: number | null;
  indexed_low: number | null;
  target_low: number;
  backfill_progress: number;
}

export interface MempoolTx {
  txid: string;
  seen_at: string;
  size: number;
  kind: TxKind;
  fee: number | null;
  transparent_out: number;
  n_actions: number;
}

export interface Mempool {
  count: number;
  total_size: number;
  total_fees: number;
  txs: MempoolTx[];
}

export interface Miner {
  address: string;
  pool: string | null;
  tag: string | null;
  blocks: number;
  rewards: number;
  fees: number;
  last_block: number;
  last_time: string;
}

export interface Miners {
  period: string;
  total_blocks: number;
  nakamoto_coefficient: number;
  top_share: number;
  miners: Miner[];
}

export interface Account {
  rank: number;
  address: string;
  balance: number;
  share: number;
  tx_count: number;
  label: string | null;
}

export interface Accounts {
  updated_at: string | null;
  indexed_from: number | null;
  accounts: Account[];
}

export interface AuditSummary {
  checks: number;
  failed: number;
  last_height: number | null;
  last_checked: string | null;
}

export interface Supply {
  height: number;
  supply: number;
  max_supply: number;
  lockbox: number;
  block_subsidy: number;
  block_to_miner: number;
  block_to_funding: number;
  block_to_lockbox: number;
  issued_24h: number;
  inflation_rate: number;
  burned_total: number;
  next_halving_height: number | null;
  next_halving_eta: string | null;
  avg_block_time: number | null;
  target_block_time: number;
  economics_pending: boolean;
  audit: AuditSummary;
  daily: { day: string; blocks: number; issued: number; to_miners: number; to_funding: number; to_lockbox: number; fees: number; burned: number }[];
}

export interface AuditCheck {
  height: number;
  prev_height: number;
  checked_at: string;
  diff_transparent: number;
  diff_sprout: number;
  diff_sapling: number;
  diff_orchard: number;
  diff_ironwood: number;
  diff_lockbox: number;
  diff_supply: number;
  ok: boolean;
}

export interface Audit {
  summary: AuditSummary;
  method: string;
  checks: AuditCheck[];
}

export interface Funding {
  height: number;
  lockbox_balance: number;
  recipients: string[];
  per_block_funding: number;
  per_block_deferred: number;
  total_funding: number;
  total_deferred: number;
  indexed_from: number | null;
  daily: { day: string; funding: number; deferred: number; blocks: number }[];
}

export interface Anonymity {
  height: number;
  sapling: number;
  orchard: number;
  ironwood: number;
  sapling_24h: number;
  orchard_24h: number;
  ironwood_24h: number;
  daily: { day: string; sapling: number | null; orchard: number | null; ironwood: number | null }[];
}

export interface Fees {
  marginal_fee: number;
  grace_actions: number;
  standard_fee: number;
  examples: { label: string; logical_actions: number; fee: number }[];
  median_fee: number | null;
  median_fee_per_action: number | null;
  conventional_share: number;
  avg_block_fullness: number;
  mempool_count: number;
  mempool_fees: number;
  mempool_bytes: number;
  fits_next_block: boolean;
}

export interface Health {
  network: string;
  node_tip: number | null;
  indexed_tip: number | null;
  lag_blocks: number | null;
  last_block_time: string | null;
  last_snapshot_time: string | null;
  lightwalletd_ok: boolean;
  audit_checks: number;
  audit_failed: number;
  reorgs: { detected_at: string; height: number; old_hash: string; new_hash: string }[];
}

export interface UnifiedAddress {
  address: string;
  network: string;
  receivers: { kind: string; pools: string; address: string | null; raw: string }[];
}

export interface Upgrade {
  name: string;
  label: string;
  activation_height: number | null;
  activated: boolean;
  activated_at: string | null;
  blocks_remaining: number | null;
  eta: string | null;
  announced_date: string | null;
  target_block_time: number;
  /** Consensus branch ID (hex) signed into transactions. */
  branch_id: string | null;
  summary: string | null;
}

export interface Upgrades {
  network: "mainnet" | "testnet";
  height: number | null;
  current: string | null;
  next: string | null;
  economics_pending: boolean;
  upgrades: Upgrade[];
}

export type ProtocolCategory = "shielded_pool" | "treasury" | "bridge" | "exchange" | "fund" | "mining_pool";

export interface Tag {
  name: string;
  category: ProtocolCategory | string;
  protocol: string | null;
  source: string;
  origin: "curated" | "consensus" | "coinbase" | "api";
  active: boolean;
}

export interface LabeledAddress extends Tag {
  address: string;
  balance: number | null;
  updated_at: string;
}

export interface ProtocolSummary {
  slug: string;
  name: string;
  category: ProtocolCategory | string;
  website: string | null;
  description: string | null;
  holdings: number | null;
  change_1d: number | null;
  change_7d: number | null;
  change_30d: number | null;
  inflow_7d: number | null;
  outflow_7d: number | null;
  addresses: number;
  sparkline: number[];
  stats: Record<string, unknown> | null;
}

export interface ProtocolDay {
  day: string;
  holdings: number;
  inflow: number;
  outflow: number;
}

export interface ProtocolTx {
  txid: string;
  height: number;
  time: string;
  kind: TxKind;
  delta: number;
}

export interface ProtocolDetail {
  protocol: ProtocolSummary;
  daily: ProtocolDay[];
  addresses: LabeledAddress[];
  recent_txs: ProtocolTx[];
  indexed_from: number | null;
}

export type InscriptionMedia =
  | "image"
  | "svg"
  | "html"
  | "collection"
  | "ipfs"
  | "text"
  | "json"
  | "audio"
  | "video"
  | "other";
export type InscriptionState = "transparent" | "shielded" | "burned";

export interface InscriptionRow {
  /** Genesis txid + `i0`. */
  id: string;
  /** Token documents take numbers too, so indexed numbers have gaps. */
  number: number;
  content_type: string;
  media: InscriptionMedia;
  content_len: number;
  txid: string;
  height: number;
  time: string;
  owner: string | null;
  state: InscriptionState;
  transfers: number;
  hidden: boolean;
  /** ZRC-721 collection (items and deploys). */
  collection: string | null;
  item: string | null;
  /** Launchpad drop name, when curated (e.g. Zemon). */
  drop_name?: string | null;
  /** Start of the body, for text and JSON. */
  preview: string | null;
}

export interface InscriptionPage {
  items: InscriptionRow[];
  next: number | null;
}

export interface InscriptionStats {
  total: number;
  numbered: number;
  by_media: { key: string; count: number }[];
  by_state: { key: string; count: number }[];
  holders: number;
  collections: number;
  pending: number;
  scan_height: number | null;
  first_height: number;
  tip: number | null;
}

export interface InscriptionEvent {
  kind: "inscribed" | "transfer" | "sale" | "shielded" | "burned";
  /** Sales: paid to the seller, zatoshis. */
  price: number | null;
  txid: string;
  height: number;
  time: string;
  from_addr: string | null;
  to_addr: string | null;
}

export interface InscriptionDetail extends InscriptionRow {
  genesis_height: number;
  sha256: string;
  reveal_txids: string[];
  location: string | null;
  text: string | null;
  /** IPFS location of the image (collection items, IPFS NFTs). */
  ipfs: string | null;
  name: string | null;
  description: string | null;
  attributes: { trait_type: string; value: string }[];
  events: InscriptionEvent[];
  /** Launchpad drop this NFT was minted in. */
  drop: { slug: string; name: string } | null;
  prev: string | null;
  next: string | null;
}

export interface Link {
  label: string;
  url: string;
}

/** Where a project's items live, which bounds what ZScan can verify. */
export type NftKind = "inscription" | "marketplace" | "zsa-testnet" | "other-chain" | "upcoming";

export interface ProjectInfo {
  description: string;
  website: string | null;
  x: string | null;
  discord: string | null;
  telegram: string | null;
  minted_at: string | null;
  mint_price_zec: number | null;
  marketplaces: Link[];
  confidence: "verified" | "likely";
  sources: Link[];
}

export interface CollectionOnchain {
  kind: "zrc721" | "drop";
  key: string;
  items: number;
  unique_items: number;
  holders: number;
  shielded: number;
  deployed: boolean;
  deploy_inscription: string | null;
  creator: string | null;
  first_time: string;
  last_time: string;
  sales: number;
  volume: number;
  last_price: number | null;
}

/** As the marketplace reports it; amounts in zatoshis. */
export interface VenueStats {
  venue: string;
  url: string;
  floor: number | null;
  listings: number | null;
  /** Items with an open bid. */
  bids: number | null;
  volume: number | null;
  sales: number | null;
  volume_24h: number | null;
  sales_24h: number | null;
  owners: number | null;
  minted: number | null;
}

export interface CollectionRow {
  slug: string;
  name: string;
  kind: NftKind;
  supply: number | null;
  /** YYYY-MM-DD. */
  launched: string | null;
  /** API path of the collection picture. */
  image: string | null;
  project: ProjectInfo | null;
  onchain: CollectionOnchain | null;
  market: VenueStats | null;
  /** Recent trading (on-chain sales, or ZScan's archive of the venue's sales). */
  activity: NftActivity | null;
}

export interface NftActivity {
  source: "chain" | "archive";
  sales_24h: number;
  volume_24h: number;
  sales_7d: number;
  volume_7d: number;
  sales_30d: number;
  volume_30d: number;
  /** Percent. */
  floor_change_24h: number | null;
  /** Last 14 UTC days, oldest first. */
  daily_volume: number[];
}

export interface TraitValue {
  trait_type: string;
  value: string;
  count: number;
  listed: number;
  floor: number | null;
  sales_7d: number;
  median_7d: number | null;
}

export interface RarityTier {
  from_rank: number;
  to_rank: number;
  items: number;
  listed: number;
  floor: number | null;
  sales_7d: number;
  median_7d: number | null;
}

export interface CollectionStats {
  activity: NftActivity | null;
  history: { day: string; sales: number; volume: number; median: number | null; floor: number | null; listings: number | null }[];
  floor_series: { time: string; floor: number | null; listings: number | null }[];
  recorded_sales: number;
  recorded_volume: number;
  first_sale: string | null;
  traded_items: number;
  days_of_inventory: number | null;
  book: {
    tiers: RarityTier[];
    deals: { item: VenueItem; reference: number; discount_pct: number }[];
    depth: { up_to: number | null; listings: number }[];
    top_bid: number | null;
  };
  traits: TraitValue[];
  top_sales: { item: string; name: string; price: number; time: string; image: string; href: string }[];
  importing: boolean;
}

export interface Trait {
  trait_type: string;
  value: string;
}

export interface VenueItem {
  id: string;
  name: string;
  traits: Trait[];
  rank: number | null;
  ask: number | null;
  bid: number | null;
  last: number | null;
  url: string;
}

export interface VenueItemDetail extends VenueItem {
  description: string | null;
  minted_at: string | null;
  history: { kind: string; price: number | null; time: string | null }[];
  trait_stats: { trait_type: string; value: string; pct: number; floor: number | null }[];
  tier: RarityTier | null;
  sales: { time: string; price: number; via: string | null }[];
}

export interface VenueSale {
  item_id: string;
  name: string;
  price: number;
  time: string;
}

export interface NftSale {
  id: string;
  number: number;
  media: InscriptionMedia;
  collection: string | null;
  item: string | null;
  drop_name?: string | null;
  price: number;
  seller: string | null;
  buyer: string | null;
  txid: string;
  height: number;
  time: string;
}

export interface CollectionDetail extends CollectionRow {
  meta: string | null;
  items_page: InscriptionRow[];
  next: number | null;
  holders_list: { address: string; count: number }[];
  recent_sales: NftSale[];
  venue_items: VenueItem[];
  venue_total: number | null;
  venue_sales: VenueSale[];
  /** With view=art: every artwork of a ZRC-721 collection, minted or not. */
  artworks: { id: string; name: string; image: string; inscription: string | null }[];
  artworks_total: number | null;
}

export interface AddressInscriptions {
  address: string;
  inscriptions: InscriptionRow[];
  inscription_count: number;
}

export interface TxInscription {
  id: string;
  number: number;
  content_type: string;
  media: InscriptionMedia;
  collection: string | null;
  item: string | null;
  kind: InscriptionEvent["kind"];
  price: number | null;
  from_addr: string | null;
  to_addr: string | null;
}

/** A cross-chain movement of ZEC (GET /v1/bridges/events). */
export interface BridgeEvent {
  protocol: string;
  /** Relative to Zcash: "in" = ZEC arrived on Zcash, "out" = ZEC left it. */
  direction: "in" | "out";
  amount: number;
  /** CHAIN.SYMBOL, e.g. "ETH.USDT". */
  counter_asset: string;
  counter_chain: string;
  usd: number | null;
  zcash_txid: string | null;
  external_url: string | null;
  status: string;
  time: string;
  counter_amount: number | null;
  zcash_address: string | null;
  address_kind: "transparent" | "unified" | "sapling" | null;
  referral: string | null;
}

/** Every item of a marketplace-kept collection, compact, for the collection map. */
export interface CollectionMap {
  supply: number;
  floor: number | null;
  /** Rarity bands with their median sale of the last 7 days (null: too few sales). */
  bands: { from_rank: number; to_rank: number; reference: number | null }[];
  /** A listing this far under its band's reference is a deal (0.1 = 10%). */
  deal_discount: number;
  traits: { trait_type: string; values: string[] }[];
  /** [id, rank, ask, bid, last, archived sales, archived volume, one value index per trait type (-1: none)]. */
  items: [number, number | null, number | null, number | null, number | null, number, number, number[]][];
  /** Thumbnails: item n at slot n - 1, `cols` per row, `cell` pixels each. */
  atlas: { url: string; cell: number; cols: number };
}

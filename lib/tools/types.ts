export interface TxInput {
  prev_txid: string | null;
  prev_n: number | null;
  coinbase_data: string | null;
}
export interface TxOutput {
  n: number;
  value: number;
  address: string | null;
  script: string;
  op_return: string | null;
}
export interface Action {
  nullifier: string;
  cmx: string;
}
export interface ParsedTx {
  txid: string;
  version: number;
  size: number;
  is_coinbase: boolean;
  lock_time: number;
  expiry_height: number | null;
  inputs: TxInput[];
  outputs: TxOutput[];
  sprout_vb: number;
  sapling_vb: number;
  orchard_vb: number;
  ironwood_vb: number;
  n_joinsplits: number;
  sapling_spends: string[];
  sapling_outputs: string[];
  orchard_actions: Action[];
  ironwood_actions: Action[];
}
export interface DecodedTx {
  tx: ParsedTx;
  pools: string[];
  logical_actions: number;
  conventional_fee: number;
  mined_height: number | null;
  in_mempool: boolean;
}
export interface Receiver {
  kind: string;
  pools: string;
  address: string | null;
  raw: string;
}
export interface AddressInfo {
  address: string;
  network: string;
  kind: string;
  pools: string[];
  can_receive_memo: boolean;
  transparent_only: boolean;
  raw: string | null;
  p2pkh_equivalent: string | null;
  receivers: Receiver[] | null;
}
export interface BroadcastResponse {
  txid: string | null;
  error_code: number;
  error_message: string;
}

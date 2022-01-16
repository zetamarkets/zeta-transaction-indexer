import { Kind } from "@zetamarkets/sdk/dist/types";
import { TransactionError } from "@solana/web3.js";
import { Instruction } from "@project-serum/anchor";

export interface EventQueueHeader {
  head: number;
  count: number;
  seqNum: number;
}

export interface Trade {
  seq_num: number;
  timestamp: number;
  owner_pub_key: string;
  expiry_series_index: number;
  market_index: number;
  expiry_timestamp: number;
  strike: number;
  kind: Kind;
  is_fill: boolean;
  is_maker: boolean;
  is_bid: boolean;
  price: number;
  size: number;
}

export interface Pricing {
  timestamp: number;
  slot?: number;
  expiry_series_index: number;
  expiry_timestamp: number;
  market_index: number;
  strike: number;
  kind: Kind;
  theo: number;
  delta: number;
  sigma: number;
  vega: number;
}

export interface Surface {
  timestamp: number;
  slot?: number;
  expiry_series_index: number;
  expiry_timestamp: number;
  vol_surface: number[];
  nodes: number[];
  interest_rate: number;
}

export interface IZetaTransaction {
  transaction_id: string;
  block_timestamp: number;
  slot: number;
  is_successful: boolean;
  fee: number;
  accounts: string[];
  instructions: Instruction[];
  log_messages: string[];
}

import { idl } from "@zetamarkets/sdk";
import * as anchor from "@project-serum/anchor";
import {
  Connection,
  PublicKey,
  PartiallyDecodedInstruction,
  ParsedConfirmedTransaction,
  TransactionError,
} from "@solana/web3.js";
import { putFirehoseBatch } from "./utils/firehose";

const MAX_SIGNATURE_BATCH_SIZE = 100;

const connection = new Connection(process.env.RPC_URL, "finalized");
let coder = new anchor.Coder(idl as anchor.Idl);

let before = undefined;
let until = undefined;

interface IZetaTransaction {
  transaction_id: string;
  block_timestamp: number;
  slot: number;
  is_successful: boolean;
  error: TransactionError;
  fee: number;
  accounts: string[];
  instructions: anchor.Instruction[];
  log_messages: string[];
}

function parseZetaInstruction(
  ix: PartiallyDecodedInstruction
): anchor.Instruction {
  return coder.instruction.decode(ix.data, "base58");
}

function parseZetaTransaction(
  tx: ParsedConfirmedTransaction
): IZetaTransaction {
  return {
    transaction_id: tx.transaction.signatures[0],
    block_timestamp: tx.blockTime,
    slot: tx.slot,
    is_successful: tx.meta.err ? false : true,
    error: tx.meta.err,
    fee: tx.meta.fee,
    accounts: tx.transaction.message.accountKeys.map((account) =>
      account.pubkey.toString()
    ),
    instructions: tx.transaction.message.instructions.map((ix) =>
      parseZetaInstruction(ix as PartiallyDecodedInstruction)
    ),
    log_messages: tx.meta.logMessages,
  };
}

export async function scrapeTransactionBatch() {
  let sigInfos = await connection.getConfirmedSignaturesForAddress2(
    new PublicKey(process.env.PROGRAM_ID),
    {
      before: before,
      until: until,
      limit: MAX_SIGNATURE_BATCH_SIZE,
    }
  );
  let sigs = sigInfos.map((x) => x.signature);

  let txs = await connection.getParsedConfirmedTransactions(sigs);
  let parsedTxs = txs.map(parseZetaTransaction);
  console.log(parsedTxs);

  putFirehoseBatch(txs, process.env.FIREHOSE_DS_NAME);
}
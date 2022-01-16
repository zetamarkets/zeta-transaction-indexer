import { idl } from "@zetamarkets/sdk";
import * as anchor from "@project-serum/anchor";
import {
  Connection,
  PublicKey,
  PartiallyDecodedInstruction,
  ParsedConfirmedTransaction,
} from "@solana/web3.js";
import { putFirehoseBatch } from "./utils/firehose";
import { IZetaTransaction } from "./utils/types";

const MAX_SIGNATURE_BATCH_SIZE = 100;
const idlMap = new Map(idl.instructions.map((x) => [x.name, x.args]));

const connection = new Connection(process.env.RPC_URL, "finalized");
let coder = new anchor.Coder(idl as anchor.Idl);

let before = undefined;
let until = undefined;

function parseZetaInstruction(
  ix: PartiallyDecodedInstruction
): anchor.Instruction {
  let decodedIx = coder.instruction.decode(ix.data, "base58");
  console.log(decodedIx);
  Object.keys(decodedIx.data).forEach((key, index) => {
    let value = decodedIx.data[key];
    let idlArgs = idlMap.get(decodedIx.name);
    let argName = idlArgs[index].name;
    let argType = idlArgs[index].type;
    // if (anchor.BN.isBN(value)) {
    //   decodedIx.data[key] = value.toNumber();
    // }
    // if (key === "side") {
    //   decodedIx.data[key] = Object.keys(value)[0];
    // }
    if (argType === "u64") {
      decodedIx.data[key] = value.toNumber() / 10 ** 6;
    }
    if (key === "side") {
      decodedIx.data[key] = Object.keys(value)[0];
    }
  });
  console.log(decodedIx);

  // console.log(idlMap.get(decodedIx.name));
  return decodedIx;
}

function parseZetaTransaction(
  tx: ParsedConfirmedTransaction
): IZetaTransaction {
  return {
    transaction_id: tx.transaction.signatures[0],
    block_timestamp: tx.blockTime,
    slot: tx.slot,
    is_successful: tx.meta.err ? false : true,
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
  // console.log(JSON.stringify(parsedTxs.map((x) => x.instructions)));

  // putFirehoseBatch(parsedTxs, process.env.FIREHOSE_DS_NAME);
}

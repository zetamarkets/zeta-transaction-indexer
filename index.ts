// require("dotenv").config();
import { Exchange, Network, utils } from "@zetamarkets/sdk";
import { PublicKey, Connection } from "@solana/web3.js";
import * as anchor from "@project-serum/anchor";
import { putFirehoseBatch } from "./utils/firehose";
import { getTxIndexMetadata, putS3Batch, putTxIndexMetadata } from "./utils/s3";
import { parseZetaTransaction } from "./utils/transaction-parser";

const MAX_SIGNATURE_BATCH_SIZE = 200;

const connection = new Connection(process.env.RPC_URL, "finalized");

const network =
  process.env!.NETWORK === "mainnet"
    ? Network.MAINNET
    : process.env!.NETWORK === "devnet"
    ? Network.DEVNET
    : Network.LOCALNET;

export async function scrapeTransactionBatch(
  before: string,
  until: string
): Promise<{ finished: boolean; lastProcessedSig: string }> {
  console.log(`Fetching all txs before ${before}`);

  let sigInfos = await connection.getConfirmedSignaturesForAddress2(
    new PublicKey(process.env.PROGRAM_ID),
    {
      before: before,
      until: until,
      limit: MAX_SIGNATURE_BATCH_SIZE,
    }
  );
  if (sigInfos.length == 0) {
    console.log("No more txs to scrape!");

    return {
      finished: true,
      lastProcessedSig: before,
    };
  }

  let sigs = sigInfos.map((x) => x.signature);
  let lastProcessedSig = sigs[sigs.length - 1];

  let txs = await connection.getParsedConfirmedTransactions(sigs);
  let parsedTxs = txs.map(parseZetaTransaction);
  console.log(`Fetched tx range: 
  start: ${sigs[0]} (${new Date(parsedTxs[0].block_timestamp * 1000)})
  end: ${lastProcessedSig} (${new Date(
    parsedTxs[sigs.length - 1].block_timestamp * 1000
  )})`);

  // putFirehoseBatch(parsedTxs, process.env.FIREHOSE_DS_NAME);
  // await putTxIndexMetadata(before, until);
  // console.log(indices);

  putS3Batch(parsedTxs, process.env.S3_BUCKET_NAME);
  return {
    finished: false,
    lastProcessedSig: lastProcessedSig,
  };
}

const main = async () => {
  let { first, last } = await getTxIndexMetadata(process.env.S3_BUCKET_NAME);
  let finished = false;
  let lastProcessedSig = undefined;
  if (last !== undefined) {
    console.log(`Resuming transaction indexing until ${last}`);
  } else {
    console.log(`No prior transactions indexed, starting from scratch`);
  }
  while (!finished) {
    let r = await scrapeTransactionBatch(lastProcessedSig, last);
    await putTxIndexMetadata(
      process.env.S3_BUCKET_NAME,
      undefined,
      r.lastProcessedSig
    );
    finished = r.finished;
    lastProcessedSig = r.lastProcessedSig;
    console.log();
  }
};

main().catch(console.error.bind(console));

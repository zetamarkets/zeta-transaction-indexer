import { Connection } from "@solana/web3.js";
import * as anchor from "@project-serum/anchor";
import { getTxIndexMetadata, putS3Batch, putTxIndexMetadata } from "./utils/s3";
import { parseZetaTransaction } from "./utils/transaction-parser";
import { PROGRAM_ID, MAX_SIGNATURE_BATCH_SIZE } from "./utils/constants";
import { sleep } from "@zetamarkets/sdk/dist/utils";

let connection = new Connection(process.env.RPC_URL, "finalized");

export async function scrapeTransactionBatch(
  before: string,
  until: string
): Promise<{
  sig_len: number;
  latestProcessedSig: string;
  earliestProcessedSig: string;
}> {
  console.log(`Fetching all txs before ${before}`);

  // Note: this also grabs CPI calls
  let sigInfos = await connection.getConfirmedSignaturesForAddress2(
    PROGRAM_ID,
    {
      before: before,
      until: until,
      limit: MAX_SIGNATURE_BATCH_SIZE,
    }
  );
  if (sigInfos.length == 0) {
    return {
      sig_len: sigInfos.length,
      latestProcessedSig: before,
      earliestProcessedSig: undefined,
    };
  }

  let sigs = sigInfos.map((x) => x.signature);

  let txs = await connection.getParsedConfirmedTransactions(sigs);
  // Chop off the straggler transactions from each end
  // We basically don't have a guarantee that those txes are in complete blocks
  // which can mess up due to non-deterministic intra-block ordering
  txs = txs
    .filter((tx) => tx) // remove nulls
    .filter(
      (tx) => tx.slot !== txs[0].slot && tx.slot !== txs[txs.length - 1].slot
    );
  // Parse transactions using program IDL
  let parsedTxs = txs.map(parseZetaTransaction);

  let latestProcessedSig = parsedTxs[0].transaction_id;
  let earliestProcessedSig = parsedTxs[parsedTxs.length - 1].transaction_id;
  console.log(`Fetched tx range (${parsedTxs.length} txs): 
  latest: ${latestProcessedSig} (${new Date(
    parsedTxs[0]?.block_timestamp * 1000
  )})
  earliest: ${earliestProcessedSig} (${new Date(
    parsedTxs[sigs.length - 1]?.block_timestamp * 1000
  )})`);

  putS3Batch(parsedTxs, process.env.S3_BUCKET_NAME);
  return {
    sig_len: sigInfos.length,
    latestProcessedSig: latestProcessedSig,
    earliestProcessedSig: earliestProcessedSig,
  };
}

const indexingLoop = async () => {
  while (true) {
    let { earliest, latest } = await getTxIndexMetadata(
      process.env.S3_BUCKET_NAME
    );
    let earliestProcessedSig, latestProcessedSig;

    if (latest !== undefined) {
      console.log(`Resuming transaction indexing until ${latest}\n`);
    } else {
      console.log(`No prior transactions indexed, starting from scratch\n`);
    }
    while (true) {
      let r = await scrapeTransactionBatch(earliestProcessedSig, latest);
      // only update latest pointer on init
      if (earliestProcessedSig === undefined) {
        latestProcessedSig = r.latestProcessedSig;
      }
      earliestProcessedSig = r.earliestProcessedSig;
      // If indices actually need to be updated (sigs length > 0)
      if (r.sig_len > 0) {
        await putTxIndexMetadata(
          process.env.S3_BUCKET_NAME,
          earliestProcessedSig,
          latestProcessedSig
        );
      }
      if (r.sig_len < MAX_SIGNATURE_BATCH_SIZE) {
        console.log("%cNo more txs to scrape!", "color: green");
        break;
      }
    }
    // Wait until rescrape
    await sleep(10_000);
  }
};

export const refreshExchange = async () => {
  connection = new Connection(process.env.RPC_URL, "finalized");
};

const main = async () => {
  indexingLoop();

  setInterval(async () => {
    console.log("%cRefreshing Exchange", "color: cyan");
    refreshExchange();
  }, 1000 * 60 * 30); // Refresh every 30 minutes
};

main().catch(console.error.bind(console));

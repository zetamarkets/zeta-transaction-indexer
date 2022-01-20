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
  finished: boolean;
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
      finished: true,
      latestProcessedSig: undefined,
      earliestProcessedSig: undefined,
    };
  }

  let sigs = sigInfos.map((x) => x.signature);
  let latestProcessedSig = sigs[0];
  let earliestProcessedSig = sigs[sigs.length - 1];

  let txs = await connection.getParsedConfirmedTransactions(sigs);
  let parsedTxs = txs.filter((tx) => tx).map(parseZetaTransaction);
  console.log(`Fetched tx range (${txs.length} txs): 
  latest: ${latestProcessedSig} (${new Date(
    parsedTxs[0]?.block_timestamp * 1000
  )})
  earliest: ${earliestProcessedSig} (${new Date(
    parsedTxs[sigs.length - 1]?.block_timestamp * 1000
  )})`);

  putS3Batch(parsedTxs, process.env.S3_BUCKET_NAME);
  return {
    finished: sigs.length < MAX_SIGNATURE_BATCH_SIZE,
    latestProcessedSig: latestProcessedSig,
    earliestProcessedSig: earliestProcessedSig,
  };
}

const indexingLoop = async () => {
  let { earliest, latest } = await getTxIndexMetadata(
    process.env.S3_BUCKET_NAME
  );
  while (true) {
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
      // If indices actually need to be updates (sigs length > 0)
      if (earliestProcessedSig !== undefined) {
        await putTxIndexMetadata(
          process.env.S3_BUCKET_NAME,
          earliestProcessedSig,
          latestProcessedSig
        );
      }
      console.log();
      if (r.finished) {
        console.log("%cNo more txs to scrape!", "color: green");
        break;
      }
    }
    // Wait until rescrape
    await sleep(5000);
    latest = latestProcessedSig;
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

import { Connection } from "@solana/web3.js";
import { getTxIndexMetadata, putTxIndexMetadata } from "./utils/s3";
import { putFirehoseBatch } from "./utils/firehose";
import {
  PROGRAM_ID,
  MAX_SIGNATURE_BATCH_SIZE,
  DEBUG_MODE,
} from "./utils/constants";
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
      sig_len: 0,
      latestProcessedSig: before,
      earliestProcessedSig: undefined,
    };
  }

  let sigs = sigInfos.map((x) => x.signature);

  let txs = await connection.getParsedTransactions(sigs);
  // console.log(txs);

  // let txs = await connection.getTransactions(sigs, {
  //   commitment: "finalized",
  //   maxSupportedTransactionVersion: 0,
  // });

  txs = txs.filter((tx) => tx); // remove nulls
  
  // Chop off the straggler transactions from each end
  // We basically don't have a guarantee that those txes are in complete blocks
  // which can mess up due to non-deterministic intra-block ordering
  txs = txs.filter(
    (tx) => tx.slot !== txs[0].slot && tx.slot !== txs[txs.length - 1].slot
  );
  if (txs.length == 0) {
    return {
      sig_len: 0,
      latestProcessedSig: before,
      earliestProcessedSig: undefined,
    };
  }

  let latestProcessedSig = txs[0].transaction.signatures[0];
  let earliestProcessedSig = txs[txs.length - 1].transaction.signatures[0];
  console.log(`Fetched tx range (${txs.length} txs): 
  latest: ${latestProcessedSig} (${new Date(txs[0]?.blockTime * 1000)})
  earliest: ${earliestProcessedSig} (${new Date(
    txs[sigs.length - 1]?.blockTime * 1000
  )})`);

  // if (!DEBUG_MODE) {
  //   putFirehoseBatch(txs, process.env.FIREHOSE_DS_NAME_TRANSACTIONS);
  // }
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
      if (r.sig_len > 0 && !DEBUG_MODE) {
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

const main = async () => {
  if (DEBUG_MODE) {
    console.log("Running in debug mode, will not push to AWS buckets");
  }
  indexingLoop();
};

main().catch(console.error.bind(console));

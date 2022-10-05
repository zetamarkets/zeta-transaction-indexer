import {
  Commitment,
  ConfirmedSignatureInfo,
  ConfirmedSignaturesForAddress2Options,
  Connection,
  ConnectionConfig,
  Finality,
  GetVersionedTransactionConfig,
  ParsedTransactionWithMeta,
  PublicKey,
  SolanaJSONRPCError,
  TransactionSignature,
  VersionedTransactionResponse,
} from "@solana/web3.js";
import { getTxIndexMetadata, putTxIndexMetadata } from "./utils/s3";
import { putFirehoseBatch } from "./utils/firehose";
import {
  PROGRAM_ID,
  MAX_SIGNATURE_BATCH_SIZE,
  DEBUG_MODE,
  MAX_TX_BATCH_SIZE,
} from "./utils/constants";
import { sleep } from "@zetamarkets/sdk/dist/utils";

class SolanaRPC {
  nodeUrl;
  commitmentOrConfig;
  connection;
  NODE_URL_1;
  NODE_URL_2;
  period;
  MAX_NODE_THRESHOLD = 10000;

  constructor(
    nodeUrl1,
    nodeUrl2?,
    commitmentOrConfig?: Commitment | ConnectionConfig
  ) {
    this.nodeUrl = nodeUrl1;
    this.commitmentOrConfig = commitmentOrConfig;
    this.connection = new Connection(this.nodeUrl, this.commitmentOrConfig);
    this.NODE_URL_1 = nodeUrl1;
    this.NODE_URL_2 = nodeUrl2 || "https://solana-api.projectserum.com";
    this.period = 100;
    console.log(`Using RPC: ${this.nodeUrl}`);
  }

  backoff() {
    console.log("Backing off");
    if (this.period > this.MAX_NODE_THRESHOLD) {
      if (this.nodeUrl == this.NODE_URL_1) {
        this.nodeUrl = this.NODE_URL_2;
      } else {
        this.nodeUrl = this.NODE_URL_1;
      }
      this.connection = new Connection(this.nodeUrl, this.commitmentOrConfig);
      console.log(`Switching to RPC node: ${this.nodeUrl}`);
      this.period = 100;
    }
    sleep(this.period);
    this.period *= 2;
  }

  getConfirmedSignaturesForAddress2(
    address: PublicKey,
    options?: ConfirmedSignaturesForAddress2Options,
    commitment?: Finality
  ): Promise<ConfirmedSignatureInfo[]> {
    while (true) {
      try {
        return this.connection.getConfirmedSignaturesForAddress2(
          address,
          options,
          commitment
        );
      } catch (error) {
        console.error(
          `<RPC> getConfirmedSignaturesForAddress2 failed with error ${error}`
        );
        this.backoff();
      }
    }
  }

  getParsedTransactions(
    signatures: string[],
    commitmentOrConfig?: Finality | GetVersionedTransactionConfig
  ): Promise<ParsedTransactionWithMeta[]> {
    while (true) {
      try {
        return this.connection.getParsedTransactions(
          signatures,
          commitmentOrConfig
        );
      } catch (error) {
        console.error(`<RPC> getParsedTransactions failed with error ${error}`);
        this.backoff();
      }
    }
  }
}

// let connection = new Connection(process.env.RPC_URL, "finalized");

let rpc = new SolanaRPC(
  process.env.RPC_URL_1,
  process.env.RPC_URL_2,
  "finalized"
);

function spliceIntoChunks(arr, chunkSize) {
  const res = [];
  while (arr.length > 0) {
    const chunk = arr.splice(0, chunkSize);
    res.push(chunk);
  }
  return res;
}

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
  let sigInfos = await rpc.getConfirmedSignaturesForAddress2(PROGRAM_ID, {
    before: before,
    until: until,
    limit: MAX_SIGNATURE_BATCH_SIZE,
  });
  if (sigInfos.length == 0) {
    return {
      sig_len: 0,
      latestProcessedSig: before,
      earliestProcessedSig: undefined,
    };
  }

  let sigs = sigInfos.map((x) => x.signature);
  let sig_chunks = spliceIntoChunks(sigs, MAX_TX_BATCH_SIZE);
  let txs = (
    await Promise.all(sig_chunks.map((s) => rpc.getParsedTransactions(s)))
  ).flat();

  // txs = txs.filter((tx) => tx); // remove nulls

  // Chop off the straggler transactions from each end
  // We basically don't have a guarantee that those txes are in complete blocks
  // which can mess up due to non-deterministic intra-block ordering
  // txs = txs.filter(
  //   (tx) => tx.slot !== txs[0].slot && tx.slot !== txs[txs.length - 1].slot
  // );
  if (txs.length == 0) {
    return {
      sig_len: 0,
      latestProcessedSig: before,
      earliestProcessedSig: undefined,
    };
  }

  let latestProcessedSig = txs[0].transaction.signatures[0];
  let earliestProcessedSig = txs[txs.length - 1].transaction.signatures[0];
  console.log(`Fetched tx range (${txs.length} txs, ${sigInfos.length} sigs): 
  latest: ${latestProcessedSig} (${new Date(txs[0]?.blockTime * 1000)})
  earliest: ${earliestProcessedSig} (${new Date(
    txs[txs.length - 1]?.blockTime * 1000
  )})`);

  if (!DEBUG_MODE) {
    putFirehoseBatch(txs, process.env.FIREHOSE_DS_NAME_TRANSACTIONS);
  }
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
      if (r.sig_len < MAX_SIGNATURE_BATCH_SIZE / 2) {
        console.log("%cNo more txs to scrape!", "color: green");
        // break;
        return;
      }
    }
    // Wait until rescrape
    await sleep(10_000);
  }
};

export const refreshConnection = async () => {
  rpc.connection = new Connection(rpc.nodeUrl, rpc.commitmentOrConfig);
};

const main = async () => {
  if (DEBUG_MODE) {
    console.log("Running in debug mode, will not push to AWS buckets");
  }
  indexingLoop();

  setInterval(async () => {
    console.log("%cRefreshing rpc connection", "color: cyan");
    refreshConnection();
  }, 1000 * 60 * 5); // Refresh every 5 minutes
};

main().catch(console.error.bind(console));

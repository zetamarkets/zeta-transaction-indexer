import {
  ConfirmedSignatureInfo,
  Connection,
  PublicKey,
  TransactionSignature,
} from "@solana/web3.js";
import { sendMessage } from "./utils/sqs";
import { SolanaRPC } from "./utils/rpc";
import { MAX_SIGNATURE_BATCH_SIZE, DEBUG_MODE } from "./utils/constants";
import { sleep } from "@zetamarkets/sdk/dist/utils";
import {
  readSignatureCheckpoint,
  writeSignatureCheckpoint,
} from "./utils/dynamodb";

let rpc = new SolanaRPC(
  process.env.RPC_URL_1,
  process.env.RPC_URL_2,
  "finalized"
);

async function indexSignaturesForAddress(
  address: PublicKey,
  before?: TransactionSignature,
  until?: TransactionSignature
) {
  let sigs: ConfirmedSignatureInfo[];
  let latest = before;
  let earliest = until;
  do {
    sigs = await rpc.getSignaturesForAddressWithRetries(address, {
      before: latest,
      until: earliest,
      limit: 1000,
    });
    sigs.reverse();
    // Edge case where you enter indexing but there's nothing to index
    if (!sigs || sigs.length === 0) {
      // Edge case when before is undefined and there are no new txes to pull from rpc
      console.debug(`sigs ${sigs}`);
      return { earliest: "", latest: before ? before : until };
    }

    latest = sigs[sigs.length - 1].signature;
    earliest = sigs[0].signature;
    // on the first fetch set the latest tx sig (because from here we go back in time)
    if (before === undefined) {
      before = latest;
    }

    if (sigs[0] == undefined || !sigs[sigs.length - 1] == undefined) {
      console.warn("Null signature detected");
    }
    console.log(
      `Indexed [${sigs.length}] txs: ${sigs[0].signature} (${new Date(
        sigs[0].blockTime * 1000
      ).toISOString()}) - ${sigs[sigs.length - 1].signature} (${new Date(
        sigs[sigs.length - 1].blockTime * 1000
      ).toISOString()})`
    );

    // push messages to sqs
    if (!DEBUG_MODE) {
      await sendMessage(
        sigs.map((s) => s.signature),
        process.env.SQS_QUEUE_URL
      );
    }

    // update local pointers
    latest = earliest;
    earliest = until;
  } while (sigs && sigs.length === MAX_SIGNATURE_BATCH_SIZE);
  // update remote checkpoints
  await writeSignatureCheckpoint(process.env.CHECKPOINT_TABLE_NAME, "", before);
  return { earliest: "", latest: before };
}

export const refreshConnection = async () => {
  rpc.connection = new Connection(rpc.nodeUrl, rpc.commitmentOrConfig);
};

const main = async () => {
  if (DEBUG_MODE) {
    console.log("Running in debug mode, will not push to AWS buckets");
  }

  // Periodic refresh of rpc connection to prevent hangups
  setInterval(async () => {
    console.log("%cRefreshing rpc connection", "color: cyan");
    refreshConnection();
  }, 1000 * 60 * 5); // Refresh every 5 minutes

  // get pointers from storage
  let { earliest, latest } = await readSignatureCheckpoint(
    process.env.CHECKPOINT_TABLE_NAME
  );

  // indexing outer loop
  while (true) {
    if (latest) {
      console.log(`Indexing up until: ${latest}`);
    } else {
      console.log(`No prior data, proceeding to backfill`);
    }

    ({ earliest, latest } = await indexSignaturesForAddress(
      new PublicKey(process.env.PROGRAM_ID),
      undefined,
      latest
    ));
    console.log("Indexing up to date, waiting a few seconds...");
    await sleep(10000); // 10 seconds
  }
};

main().catch(console.error.bind(console));

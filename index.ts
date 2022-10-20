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
  readFrontfillCheckpoint,
  readBackfillCheckpoint,
  writeFrontfillCheckpoint,
  writeBackfillCheckpoint,
  // readSignatureCheckpoint,
  // writeSignatureCheckpoint,
} from "./utils/dynamodb";


let rpc = new SolanaRPC(
  process.env.RPC_URL_1,
  process.env.RPC_URL_2,
  "finalized"
);


async function indexSignaturesForAddress(
  address: PublicKey,
  before?: TransactionSignature,
  until?: TransactionSignature,
  backfill_complete?: boolean,
) {
  let sigs: ConfirmedSignatureInfo[];
  let top = before;
  let bottom = until;
  let firstFlag = true;
  let newTop = undefined;
  do {
    sigs = await rpc.getSignaturesForAddressWithRetries(address, {
      before: top,
      until: bottom,
      limit: 1000,
    });
    sigs.reverse();

    // Checking if any sigs were returned
    if (!sigs || sigs.length > 0) {
      // Set top and bottom of current run
      top = sigs[sigs.length - 1].signature;
      bottom = sigs[0].signature;

      // For first iteration
      if (firstFlag) {
        // Start process (1st iteration) - write new top
        newTop = top;
        firstFlag = false;
      }

      // Logging the bottom (oldest tx) to the top (most recent tx) of the current run
      console.log(
        `Indexed [${sigs.length}] txs: ${sigs[0].signature} (${new Date(
          sigs[0].blockTime * 1000
        ).toISOString()}) - ${sigs[sigs.length - 1].signature} (${new Date(
          sigs[sigs.length - 1].blockTime * 1000
        ).toISOString()})`
      );
  
      // Push Messages to SQS
      if (!DEBUG_MODE) {
        sendMessage(
          sigs.map((s) => s.signature),
          process.env.SQS_QUEUE_URL
        );
      }

      // Update Local Pointers
      top = bottom;
      bottom = until;

      if (!backfill_complete) {
        // Update DynamoDB Checkpoint
        writeBackfillCheckpoint(
          process.env.CHECKPOINT_TABLE_NAME,
          top,
          undefined, // can to top or undefined both work here... (more useful for specific backfilling scenarios)
          false,
        );
      }

    } else {
      // No more signatures to index
      console.warn(`Signature list is empty ${sigs}`);
      // Regardless update new top for frontfill
      writeFrontfillCheckpoint(
        process.env.CHECKPOINT_TABLE_NAME,
        newTop,
      );
      if (!backfill_complete) {
        // Backfill end process extra requirement - set backfill to complete
        writeBackfillCheckpoint(
          process.env.CHECKPOINT_TABLE_NAME,
          undefined,
          undefined, // can to top or undefined both work here... (more useful for specific backfilling scenarios)
          true,
        );
      }
      break;
    }

    if (sigs[0] == undefined || !sigs[sigs.length - 1] == undefined) {
      console.error("Null signature detected");
    }

  } while (true);
  return { bottom: bottom, top: top };
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

  if (process.env.RESET === "true") {
    console.log("Resetting checkpoints...");
    writeFrontfillCheckpoint(
      process.env.CHECKPOINT_TABLE_NAME,
      undefined,
      );
    writeBackfillCheckpoint(
      process.env.CHECKPOINT_TABLE_NAME,
      undefined,
      undefined,
      false,
    );
  }

  // Start Indexing
  while (true) {
    // get pointers from storage
    let { incomplete_top, bottom, backfill_complete } = await readBackfillCheckpoint(
      process.env.CHECKPOINT_TABLE_NAME
    );
    console.log(`Incomplete Top: ${incomplete_top}, Bottom: ${bottom}, Backfill Complete: ${backfill_complete}`);
    let top = incomplete_top;

    if (process.env.FRONTFILL_ONLY === "true") {
      // Frontfill only mode
      console.log("Running in frontfill only mode...");
      backfill_complete = true;
    }

    if (backfill_complete) {
      // Frontfill

      // Checking where the old 'top' was...
      let { old_top } = await readFrontfillCheckpoint(
        process.env.CHECKPOINT_TABLE_NAME
      );

      if (!old_top) {
        // Old top is undefined something is wrong, proceed to backfill
        console.error("Backfilling Required, Setting Backfill to false")
        let { incomplete_top, bottom, backfill_complete } = await readBackfillCheckpoint(
          process.env.CHECKPOINT_TABLE_NAME
        );
        writeBackfillCheckpoint( process.env.CHECKPOINT_TABLE_NAME, incomplete_top, bottom, false);
      } else {
          // ...and indexing from the front to the old top
          console.log(`Frontfilling: Indexing up until: ${old_top}`);

          ({ bottom, top } = await indexSignaturesForAddress(
            new PublicKey(process.env.PROGRAM_ID),
            undefined,
            old_top,
            backfill_complete,
          ));
      }
    } else {
      // Backfill
      console.log(`No prior data, proceeding to backfill. Starting at: ${incomplete_top}`);
      
      ({ bottom, top } = await indexSignaturesForAddress(
        new PublicKey(process.env.PROGRAM_ID),
        incomplete_top,
        bottom,
        backfill_complete,
      ));
    }

    console.log("Indexing up to date, waiting a few seconds...");
    await sleep(10000); // 10 seconds
  }
};

main().catch(console.error.bind(console));

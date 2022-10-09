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
import { SolanaRPC } from "./utils/rpc";
import { spliceIntoChunks } from "./utils/utils";
import {
  PROGRAM_ID,
  MAX_SIGNATURE_BATCH_SIZE,
  DEBUG_MODE,
  MAX_TX_BATCH_SIZE,
} from "./utils/constants";
import { sleep } from "@zetamarkets/sdk/dist/utils";
import { Signature } from "typescript";
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
  do {
    sigs = await rpc.getSignaturesForAddressWithRetries(address, {
      before,
      until,
      limit: 1000,
    });
    sigs.reverse();
    console.log(
      `Indexed: ${sigs[0].signature} (${new Date(
        sigs[0].blockTime * 1000
      ).toISOString()}) - ${sigs[sigs.length - 1].signature} (${new Date(
        sigs[sigs.length - 1].blockTime * 1000
      ).toISOString()})`
    );
    if (!sigs[0].signature || !sigs[sigs.length - 1].signature) {
      console.warn("Null signature detected");
    }
    // update checkpoints
    await writeSignatureCheckpoint(
      process.env.CHECKPOINT_TABLE_NAME,
      sigs[0].signature,
      sigs[sigs.length - 1].signature
    );
    // update pointers for next iteration
    before = sigs[0].signature;
  } while (sigs && sigs.length > 0);
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

  // indexing outer loop
  // get pointers from storage
  let { earliest, latest } = await readSignatureCheckpoint(
    process.env.CHECKPOINT_TABLE_NAME
  );
  // backfill if no data
  let backfill = false;
  if (!earliest && !latest) {
    backfill = true;
  }
  while (true) {
    if (backfill) {
      await indexSignaturesForAddress(new PublicKey(process.env.PROGRAM_ID));
    } else {
      await indexSignaturesForAddress(
        new PublicKey(process.env.PROGRAM_ID),
        latest,
        earliest
      );
    }
  }
};

main().catch(console.error.bind(console));

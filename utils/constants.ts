import { PublicKey } from "@solana/web3.js";

export const PROGRAM_ID = new PublicKey(process.env.PROGRAM_ID);
export const MAX_SIGNATURE_BATCH_SIZE = 200;

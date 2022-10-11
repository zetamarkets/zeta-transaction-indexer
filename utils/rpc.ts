import {
  Commitment,
  ConnectionConfig,
  Connection,
  PublicKey,
  ConfirmedSignaturesForAddress2Options,
  Finality,
  ConfirmedSignatureInfo,
  GetVersionedTransactionConfig,
  ParsedTransactionWithMeta,
  SignaturesForAddressOptions,
} from "@solana/web3.js";
import { sleep } from "@zetamarkets/sdk/dist/utils";
import { int } from "aws-sdk/clients/datapipeline";

export class SolanaRPC {
  nodeUrl: string;
  commitmentOrConfig: Commitment | ConnectionConfig;
  connection: Connection;
  NODE_URL_1: string;
  NODE_URL_2: string;
  period: number;
  MAX_NODE_THRESHOLD: number = 10000;

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

  async getSignaturesForAddressWithRetries(
    address: PublicKey,
    options?: SignaturesForAddressOptions,
    commitment?: Finality
  ) {
    let sigs: ConfirmedSignatureInfo[];
    do {
      try {
        sigs = await this.connection.getSignaturesForAddress(
          address,
          options,
          commitment
        );
        // TODO: need to change this only to catch ratelimit errors (http 429)
      } catch (error) {
        console.error(
          `<RPC> getSignaturesForAddress failed with error ${error}`
        );
        this.backoff();
      }
    } while (!sigs);
    return sigs;
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

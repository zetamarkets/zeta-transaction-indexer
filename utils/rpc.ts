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
} from "@solana/web3.js";
import { sleep } from "@zetamarkets/sdk/dist/utils";

export class SolanaRPC {
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

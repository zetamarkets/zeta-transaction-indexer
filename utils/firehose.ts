import { ParsedTransactionWithMeta } from "@solana/web3.js";
import AWS from "aws-sdk";
import { AWSOptions } from "./aws-config";
import { MAX_FIREHOSE_BATCH_SIZE } from "./constants";
import { spliceIntoChunks } from "./utils";

let firehose = new AWS.Firehose(AWSOptions);

export const putFirehoseBatch = (
  data: ParsedTransactionWithMeta[],
  deliveryStreamName: string
) => {
  if (!data.length) return;
  const records = data.map((d) => {
    return { Data: JSON.stringify(d).concat("\n") };
  });
  let record_chunks = spliceIntoChunks(records, MAX_FIREHOSE_BATCH_SIZE);
  let responses = record_chunks.map(async (record_chunk) => {
    let params = {
      DeliveryStreamName: deliveryStreamName /* required */,
      Records: record_chunk,
    };

    firehose.putRecordBatch(params, function (err, data) {
      if (err) {
        console.log("Firehose putRecordBatch Error", err);
      } else {
        console.log("Firehose putRecordBatch Success", data);
      }
    });
  });
  Promise.all(responses);
};

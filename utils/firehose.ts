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
  let data_chunks = spliceIntoChunks(data, MAX_FIREHOSE_BATCH_SIZE);
  let responses = data_chunks.map(async (data_chunk) => {
    const records = data_chunk.map((d) => {
      return { Data: JSON.stringify(d).concat("\n") };
    });
    console.log(records.length);

    let params = {
      DeliveryStreamName: deliveryStreamName /* required */,
      Records: records,
    };

    firehose.putRecordBatch(params, function (err, data) {
      if (err) {
        console.log("Firehose putRecordBatch Error", err);
      } else {
        console.log("Firehose putRecordBatch Success", data);
      }
    });
  });
  // Promise.all(responses);
};

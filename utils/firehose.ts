import { ParsedTransactionWithMeta } from "@solana/web3.js";
import AWS from "aws-sdk";
import { AWSOptions } from "./aws-config";
import { ZetaTransaction } from "./types";

let firehose = new AWS.Firehose(AWSOptions);

export const putFirehoseBatch = (
  data: ParsedTransactionWithMeta[],
  deliveryStreamName: string
) => {
  if (!data.length) return;
  const records = data.map((d) => {
    return { Data: JSON.stringify(d).concat("\n") };
  });
  var params = {
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
};

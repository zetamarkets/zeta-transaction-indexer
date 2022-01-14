import AWS from "aws-sdk";
import { AWSOptions } from "./aws-config";
import { Pricing, Surface, Trade } from "./types";
import { ParsedConfirmedTransaction } from "@solana/web3.js";

let firehose = new AWS.Firehose(AWSOptions);

firehose.listDeliveryStreams(function (err, data) {
  if (err) console.log(err, err.stack);
  // an error occurred
  else console.log(data); // successful response
});

export const putFirehoseBatch = (
  data: ParsedConfirmedTransaction[],
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

import AWS from "aws-sdk";
import { AWSOptions } from "./aws-config";
import { IZetaTransaction } from "./types";
import * as date from "date-and-time";
import { tableIndices } from "./types";

let s3 = new AWS.S3(AWSOptions);

export const putTxIndexMetadata = async (
  bucketName: string,
  first: string | undefined,
  last: string | undefined
) => {
  let data = JSON.stringify({ first, last });
  await s3
    .putObject({
      Bucket: bucketName,
      Key: `metadata/${process.env.NETWORK}-indices.json`,
      Body: data,
      ContentType: "application/json",
    })
    .promise();
  console.log("S3 putObject Success", data);
};

export const getTxIndexMetadata = async (
  bucketName: string
): Promise<tableIndices> => {
  try {
    const data = await s3
      .getObject({
        Bucket: bucketName,
        Key: `metadata/${process.env.NETWORK}-indices.json`,
      })
      .promise();
    return JSON.parse(data.Body.toString("utf-8"));
  } catch (error) {
    console.error(error);
    return { first: undefined, last: undefined };
  }
};

export const putS3Batch = async (
  data: IZetaTransaction[],
  bucketName: string
) => {
  if (!data.length) return;
  const records = data
    .map((d) => {
      return JSON.stringify(d);
    })
    .join("\n");
  let d = new Date(data[0].block_timestamp * 1000);
  let df = date.format(d, "YYYY-MM-DD-HH-mm-ss");
  var params = {
    Bucket: bucketName /* required */,
    Key: `${d.getUTCFullYear()}/${String(d.getUTCMonth() + 1).padStart(
      2,
      "0"
    )}/${String(d.getUTCDate()).padStart(2, "0")}/${String(
      d.getUTCHours()
    ).padStart(2, "0")}/PUT-S3-zetamarkets-${
      process.env.NETWORK
    }-transactions-${df}-${data[0].transaction_id}-${
      data[data.length - 1].transaction_id
    }`,
    Body: records,
    ContentType: "application/json",
  };
  s3.putObject(params, function (err, data) {
    if (err) {
      console.log("S3 putObject Error", err);
    } else {
      console.log("S3 putObject Success", data);
    }
  });
};

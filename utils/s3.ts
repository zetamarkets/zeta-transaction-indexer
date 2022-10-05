import AWS from "aws-sdk";
import { AWSOptions } from "./aws-config";
import { ZetaTransaction } from "./types";
import * as date from "date-and-time";
import { TableIndices } from "./types";

let s3 = new AWS.S3(AWSOptions);

let [earliest_, latest_] = [undefined, undefined];

export const putTxIndexMetadata = async (
  bucketName: string,
  earliest: string | undefined,
  latest: string | undefined
) => {
  earliest_ = earliest;
  latest_ = latest;
  // let data = JSON.stringify({ earliest, latest });
  // await s3
  //   .putObject({
  //     Bucket: bucketName,
  //     Key: `transactions/checkpoint.json`,
  //     Body: data,
  //     ContentType: "application/json",
  //   })
  //   .promise();
  // console.log("Successfully wrote indices to S3", data);
};

export const getTxIndexMetadata = async (
  bucketName: string
): Promise<TableIndices> => {
  return { earliest: earliest_, latest: latest_ };
  // try {
  //   const data = await s3
  //     .getObject({
  //       Bucket: bucketName,
  //       Key: `transactions/checkpoint.json`,
  //     })
  //     .promise();
  //   return JSON.parse(data.Body.toString("utf-8"));
  // } catch (error) {
  //   console.error(error);
  //   return { earliest: undefined, latest: undefined };
  // }
};

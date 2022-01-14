import AWS from "aws-sdk";

export const AWSOptions: AWS.Firehose.ClientConfiguration = {
  accessKeyId: process.env.ACCESS_KEY_ID,
  secretAccessKey: process.env.SECRET_ACCESS_KEY,
  region: process.env.REGION,
};

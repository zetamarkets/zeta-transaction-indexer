import AWS from "aws-sdk";
import { AWSOptions } from "./aws-config";
import { TableIndices } from "./types";
import { TransactionSignature } from "@solana/web3.js";

let ddb = new AWS.DynamoDB(AWSOptions);

let [earliest_, latest_] = [undefined, undefined];

export const writeSignatureCheckpoint = (
  tableName: string,
  earliest: string | undefined,
  latest: string | undefined
) => {
  var params = {
    TableName: tableName,
    // Key: {
    //   earliest: { S: earliest },
    //   latest: { S: latest },
    // },
    Item: {
      'id' : {S: 'CHECKPOINT'},
      'earliest' : {S: earliest},
      'latest': { S: latest }
    }
  };

  // Call DynamoDB to add the item to the table
  ddb.putItem(params, function (err, data) {
    if (err) {
      console.log("Error", err);
    } else {
      console.log("Success", data);
    }
  });
};

export const readSignatureCheckpoint = (tableName: string) => {
  var params = {
    TableName: tableName,
    Key: {
      'id': { S: "CHECKPOINT" },
    },
    ConsistentRead: true
  };

  // Call DynamoDB to read the item from the table
  // need to fix the return here
  return ddb.getItem(params, function (err, data) {
    if (err) {
      console.log("Error", err);
      throw err;
    } else {
      console.log("Success", data.Item);
      return { "earliest": data.Item.earliest, "latest": data.Item.latest };
    }
  });
};

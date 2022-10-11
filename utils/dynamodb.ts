import AWS from "aws-sdk";
import { AWSOptions } from "./aws-config";

let ddb = new AWS.DynamoDB(AWSOptions);

let [earliest_, latest_] = [undefined, undefined];

export const writeSignatureCheckpoint = (
  tableName: string,
  earliest: string | undefined,
  latest: string | undefined
) => {
  var params = {
    TableName: tableName,
    Item: {
      id: { S: "CHECKPOINT" },
      earliest: { S: earliest },
      latest: { S: latest },
    },
  };

  // Call DynamoDB to add the item to the table
  ddb.putItem(params, function (err, data) {
    if (err) {
      console.log("Error", err);
    } else {
      console.log("Checkpoint successfully written.");
    }
  });
};

export const readSignatureCheckpoint = async (tableName: string) => {
  var params = {
    TableName: tableName,
    Key: {
      id: { S: "CHECKPOINT" },
    },
    ConsistentRead: true,
  };

  // Call DynamoDB to read the item from the table
  let q = ddb.getItem(params);
  try {
    const r = await q.promise();
    if (r.Item) {
      let earliest = r.Item.earliest.S;
      let latest = r.Item.latest.S;
      console.log(`Read checkpoint: ${earliest}, ${latest}`);
      return {
        earliest,
        latest,
      };
    } else {
      console.warn(`No checkpoint found`);
      return { earliest: undefined, latest: undefined };
    }
  } catch (error) {
    throw error;
  }
};

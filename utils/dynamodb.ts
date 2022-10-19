import AWS from "aws-sdk";
import { AWSOptions } from "./aws-config";
let ddb = new AWS.DynamoDB(AWSOptions);


export const writeBackfillCheckpoint = (
  tableName: string,
  incomplete_top: string | undefined,
  bottom: string | undefined,
  backfill_complete: boolean | false
  ) => {
    if (incomplete_top == undefined) {
      incomplete_top = ""
    }
    if (bottom == undefined) {
      bottom = ""
    }
    var params = {
      TableName: tableName,
      Item: {
        id: { S: `${process.env.NETWORK!}-backfill-checkpoint` },
        incomplete_top: { S: incomplete_top },
        bottom: { S: bottom },
        backfill_complete: { BOOL: backfill_complete },
      },
    };
    
    // Call DynamoDB to add the item to the table
    ddb.putItem(params, function (err, data) {
      if (err) {
        console.error("Error", err);
      } else {
        console.log("Backfill Checkpoint successfully written.");
      }
    });
  };


export const readBackfillCheckpoint = async (tableName: string) => {
  var params = {
    TableName: tableName,
    Key: {
      id: { S: `${process.env.NETWORK!}-backfill-checkpoint` },
    },
    ConsistentRead: true,
  };
  
  // Call DynamoDB to read the item from the table
  let q = ddb.getItem(params);
  try {
    const r = await q.promise();
    if (r.Item) {
      let incomplete_top = r.Item.incomplete_top.S;
      let bottom = r.Item.bottom.S;
      let backfill_complete = r.Item.backfill_complete.BOOL;
      if (incomplete_top == "") {
        incomplete_top = undefined;
      }
      if (bottom == "") {
        bottom = undefined;
      }
      console.log(`Read checkpoint: ${incomplete_top}, ${bottom}`);
      console.log(`Backfill complete: ${backfill_complete}`);
      return {
        incomplete_top,
        bottom,
        backfill_complete,
      };
    } else {
      console.warn(`No checkpoint found`);
      return { incomplete_top: undefined, bottom: undefined, backfill_complete: false };
    }
  } catch (error) {
    throw error;
  }
};


export const writeFrontfillCheckpoint = (
  tableName: string,
  new_top: string | undefined,
  ) => {
    if (new_top == undefined) {
      new_top = ""
    }
    var params = {
      TableName: tableName,
      Item: {
        id: { S: `${process.env.NETWORK!}-frontfill-checkpoint` },
        old_top: { S: new_top },
      },
    };
    
    // Call DynamoDB to add the item to the table
    ddb.putItem(params, function (err, data) {
      if (err) {
        console.error("Error", err);
      } else {
        console.log("Frontfill Checkpoint successfully written.");
      }
    });
  };


export const readFrontfillCheckpoint = async (tableName: string) => {
  var params = {
    TableName: tableName,
    Key: {
      id: { S: `${process.env.NETWORK!}-frontfill-checkpoint` },
    },
    ConsistentRead: true,
  };

  // Call DynamoDB to read the item from the table
  let q = ddb.getItem(params);
  try {
    const r = await q.promise();
    if (r.Item) {
      let old_top = r.Item.old_top.S;
      if (old_top == "") {
        old_top = undefined;
      }
      console.log(`Read checkpoint: ${old_top}`);
      return {
        old_top,
      };
    } else {
      console.warn(`No checkpoint found`);
      return { old_top: undefined };
    }
  } catch (error) {
    throw error;
  }
};
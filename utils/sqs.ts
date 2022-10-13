import AWS from "aws-sdk";
import { AWSOptions } from "./aws-config";

let sqs = new AWS.SQS(AWSOptions);
export const sendMessage = (data: Array<string>, queueUrl: string) => {
  if (!data.length) return;
  let messageData = { data: data };
  var params = {
    MessageBody: JSON.stringify(messageData),
    QueueUrl: queueUrl,
  };
  sqs.sendMessage(params, function (err, data) {
    if (err)
      console.error(
        `SQS write error: ${err}, ${err.stack}`
      ); // an error occurred
    else console.log(`SQS write success: ${data.MessageId}`); // successful response
  });
};

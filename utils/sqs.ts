import AWS from "aws-sdk";
import { AWSOptions } from "./aws-config";
// import { spliceIntoChunks } from "./utils";

let sqs = new AWS.SQS(AWSOptions);
export const sendMessage = (
    data: Array<string>,
    queueName: string
) => {
    if (!data.length) return;
    let messageData = { "data": data };
    var params = {
        MessageBody: JSON.stringify(messageData),
        QueueUrl: queueName
    };
    sqs.sendMessage(params, function (err, data) {
        if (err) console.log(err, err.stack); // an error occurred
        else console.log(data);           // successful response
    });
}
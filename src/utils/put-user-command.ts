// the lambda interacts with the db

import {
  DynamoDBDocumentClient,
  PutCommandInput,
  PutCommand,
  PutCommandOutput,
} from '@aws-sdk/lib-dynamodb';

interface ITableEntry {
  dynamoDBDocumentClient: DynamoDBDocumentClient;
  tableName: string;
  item: {
    account_id: string;
    account_name: string;
    account_email: string;
    email_verified: string;
    given_name: string;
    family_name: string;
  };
}

export const handleTablePutCommand = async (props: ITableEntry) => {
  // 1 input
  const input: PutCommandInput = {
    TableName: props.tableName,
    Item: {
      account_id: props.item.account_id,
      account_name: props.item.account_name,
      account_email: props.item.account_email,
      email_verified: props.item.email_verified,
      given_name: props.item.given_name,
      family_name: props.item.family_name,
    },
  };

  // 2 command
  const command: PutCommand = new PutCommand(input);

  // 3 result
  const output: PutCommandOutput = await props.dynamoDBDocumentClient.send(
    command
  );

  // 4 return result
  return output.$metadata.httpStatusCode;
};

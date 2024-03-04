/* eslint-disable complexity, max-statements */
import { PostConfirmationTriggerEvent } from 'aws-lambda';

// clients.
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { S3Client } from '@aws-sdk/client-s3';
import { CloudWatchClient } from '@aws-sdk/client-cloudwatch';
//
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

// helpers.
import { validateEvent } from './utils/validate';
import { handleBucketPutObjectCommand } from './utils/bucket';
import { handleTablePutCommand } from './utils/put-user-command';
import { handleCloudwatchEvent } from './utils/cloudWatch';

// error messages.
import {
  DYNAMO_FAILED,
  MISSING_BUCKET_OR_TABLE_NAME,
  MISSING_EMAIL,
  MISSING_EMAIL_VERIFIED,
  MISSING_FAMILY_NAME,
  MISSING_GIVEN_NAME,
  MISSING_NAME,
  MISSING_SUB,
  S3_FAILED,
} from './utils/errors';

// lazy loading clients.
let s3Client: S3Client;
let dynamoDBDocumentClient: DynamoDBDocumentClient;
let cloudWatchClient: CloudWatchClient;

export const handler = async (event: PostConfirmationTriggerEvent) => {
  if (!s3Client) {
    s3Client = new S3Client({ region: process.env.REGION });
  }

  if (!dynamoDBDocumentClient) {
    dynamoDBDocumentClient = DynamoDBDocumentClient.from(
      new DynamoDBClient({ region: process.env.REGION })
    );
  }

  if (!cloudWatchClient) {
    cloudWatchClient = new CloudWatchClient({ region: process.env.REGION });
  }

  //
  const bucketName = process.env.BUCKET_NAME || '';
  const tableName = process.env.TABLE_NAME || '';

  if (!bucketName || !tableName) throw new Error(MISSING_BUCKET_OR_TABLE_NAME);

  //

  // destructure the event
  const sub = event.request.userAttributes.sub;
  const email = event.request.userAttributes.email;
  const emailVerified = event.request.userAttributes.email_verified;
  const givenName = event.request.userAttributes.given_name;
  const familyName = event.request.userAttributes.family_name;

  const userName = event.userName;

  try {
    const validSub = validateEvent(sub);
    if (!validSub) throw new Error(MISSING_SUB);

    const validName = validateEvent(userName);
    if (!validName) throw new Error(MISSING_NAME);

    const validEmail = validateEvent(email);
    if (!validEmail) throw new Error(MISSING_EMAIL);

    const validEmailVerified = validateEvent(emailVerified);
    if (!validEmailVerified) throw new Error(MISSING_EMAIL_VERIFIED);

    const validGivenName = validateEvent(givenName);
    if (!validGivenName) throw new Error(MISSING_GIVEN_NAME);

    const validFamilyName = validateEvent(familyName);
    if (!validFamilyName) throw new Error(MISSING_FAMILY_NAME);

    // update userTable
    const item = {
      account_id: sub,
      account_name: userName,
      account_email: email,
      email_verified: emailVerified,
      given_name: givenName,
      family_name: familyName,
    };

    // interact with the db / update db --> we also send it!!
    const tableSuccess = await handleTablePutCommand({
      dynamoDBDocumentClient,
      tableName,
      item,
    });
    if (tableSuccess != 200) throw new Error(DYNAMO_FAILED);

    // interact with the bucket / update bucket --> we also send it!!
    const bucketSucces = await handleBucketPutObjectCommand({
      s3Client,
      bucketName,
      sub,
    });
    if (bucketSucces != 200) throw new Error(S3_FAILED);
  } catch (err: any) {
    await handleCloudwatchEvent({ cloudWatchClient, err, sub });
    throw err;
  }
};

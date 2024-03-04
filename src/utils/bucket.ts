import {
  S3Client,
  PutObjectCommandInput,
  PutObjectCommand,
  PutObjectCommandOutput,
} from '@aws-sdk/client-s3';

interface IBucketDirectory {
  s3Client: S3Client;
  bucketName: string;
  sub: string;
}

export const handleBucketPutObjectCommand = async (props: IBucketDirectory) => {
  // input
  const input: PutObjectCommandInput = {
    Bucket: props.bucketName,
    Key: `users/${props.sub}/`,
  };

  // command
  const command: PutObjectCommand = new PutObjectCommand(input);

  // result
  const result: PutObjectCommandOutput = await props.s3Client.send(command);
  return result.$metadata.httpStatusCode;
};

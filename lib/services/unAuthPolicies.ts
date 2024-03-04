// only put pictures in the users OWN directory

import { PolicyStatement, Effect, Role } from 'aws-cdk-lib/aws-iam';
import { IBucket } from 'aws-cdk-lib/aws-s3';
import { IKey } from 'aws-cdk-lib/aws-kms';

interface IUnAuthPolicyProps {
  bucket: IBucket;
  bucketKey: IKey;
  unAuthenticatedUserRole: Role;
}

export const UnAuthPolicies = (props: IUnAuthPolicyProps) => {
  // bucket = the same as for the the auth but only we DON'T have a user specific bucket
  // we have a general 'public' folder inside of the bucket --> so the resource id different
  const bucketPutPolicy = new PolicyStatement({
    actions: ['s3:PutObject'],
    effect: Effect.ALLOW,
    resources: [props.bucket.bucketArn + '/public/*'],
  });

  /* Also add it to the S3 cors options. Now we only put but if you want to get / delete these actions should also be in the s3 cors options */

  // kms = the same as for the auth users
  const kmsPolicy = new PolicyStatement({
    actions: ['kms:GenerateDataKey'],
    effect: Effect.ALLOW,
    resources: [props.bucketKey.keyArn],
  });

  /* we use kms to encrypt the pictures --> with the policy we can generate the key */

  // graphql
  // to let the unauth users make payments
  const graphqlPolicy = new PolicyStatement({
    actions: ['appsync:GraphQL'],
    effect: Effect.ALLOW,
    resources: [
      'arn:aws:appsync:eu-west-1:myAppSyncId:apis/xxxxx/types/Query/fields/paymentIntent',
    ],
  });

  props.unAuthenticatedUserRole.addToPolicy(bucketPutPolicy);
  props.unAuthenticatedUserRole.addToPolicy(kmsPolicy);
  props.unAuthenticatedUserRole.addToPolicy(graphqlPolicy);
};

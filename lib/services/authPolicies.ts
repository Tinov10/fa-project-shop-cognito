// only put pictures in the users OWN directory

import { PolicyStatement, Effect, Role } from 'aws-cdk-lib/aws-iam';
import { IBucket } from 'aws-cdk-lib/aws-s3';
import { IKey } from 'aws-cdk-lib/aws-kms';

interface IAuthPolicyProps {
  bucket: IBucket;
  bucketKey: IKey;
  authenticatedUserRole: Role;
}

export const AuthPolicies = (props: IAuthPolicyProps) => {
  // bucket
  const bucketPutPolicy = new PolicyStatement({
    actions: ['s3:PutObject'],
    effect: Effect.ALLOW,
    resources: [
      props.bucket.bucketArn +
        '/private/${cognito-identity.amazonaws.com:sub}/*',
    ],
  });

  /* Also add it to the S3 cors options. Now we only put but if you want to get / delete these actions should also be in the s3 cors options */

  // kms
  const kmsPolicy = new PolicyStatement({
    actions: ['kms:GenerateDataKey'],
    effect: Effect.ALLOW,
    resources: [props.bucketKey.keyArn],
  });

  /* we use kms to encrypt the pictures --> with the policy we can generate the key */

  props.authenticatedUserRole.addToPolicy(bucketPutPolicy);
  props.authenticatedUserRole.addToPolicy(kmsPolicy);
};

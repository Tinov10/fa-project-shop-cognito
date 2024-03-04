import { Stack } from 'aws-cdk-lib';
import { Role, FederatedPrincipal } from 'aws-cdk-lib/aws-iam';

interface IRoleProps {
  name: string;
  identityPoolRef: string;
  state: string;
}

export const createRole = (stack: Stack, props: IRoleProps) => {
  return new Role(stack, props.name, {
    roleName: props.name,
    assumedBy: new FederatedPrincipal(
      'cognito-identity.amazonaws.com',
      {
        StringEquals: {
          'cognito-identity.amazonaws.com:aud': props.identityPoolRef,
        },
        'ForAnyValue:StringLike': {
          'cognito-identity.amazonaws.com:amr': props.state,
        },
      },
      'sts:AssumeRoleWithWebIdentity'
    ),
  });
};

/*
Explanation: 

What is the difference between logged in users and guest users? 

If the user is logged in with Cognito (XXX) that it wil assume an identity from the identityPool. And this role is used to make calls to S3 bucket / graphql. 

If the user is NOT logged in with the Cognito identity it will assume the unauthenticated role. This is role is used to make calls: S3 bucket and graphql call. 

*/

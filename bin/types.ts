import { StackProps } from 'aws-cdk-lib';

export interface IAwsCognitoStackProps extends StackProps {
  //
  imports: {
    bucketArn: string;
    tableArn: string;
    kmsKeyArn: string; // you can also use the alias

    googleSecretName: string;
    facebookSecretName: string;

    domainCertificateArn: string;
    hostedZoneId: string;
  };

  domain: string;
  cognitoDomain: string;
  // userPool
  userPoolName: string;
  userPoolClientName: string;
  // guest users can signup with Facebook or Google
  // identityPool gets linked to the Userpool
  // when they are auth by default they are NOT a user they are auth by federate login
  // to make them users
  identityPoolName: string;

  postSignupLambdaName: string;

  // roles
  authenticatedUserName: string;
  unAuthenticatedUserName: string;

  email: {
    subject: string;
    body: string;
    from: string;
    name: string;
    replyTo: string;
  };
  callbackUrls: string[];
  logoutUrls: string[];
  redirectUri: string;
}

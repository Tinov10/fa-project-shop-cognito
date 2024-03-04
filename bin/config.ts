import { IAwsCognitoStackProps } from './types';

export const stackConfig: IAwsCognitoStackProps = {
  imports: {
    bucketArn: 'myBucketArn',
    tableArn: 'myTableArn',
    kmsKeyArn: 'myKmsArn', // you can also use the alias

    googleSecretName: 'myGoogleClientSecret',
    facebookSecretName: 'myFacebookClientSecret',

    domainCertificateArn: 'usEast1Certificate', // we need a certificate that has to be in US East 1 for the domain
    hostedZoneId: 'myRoute53HostedZondeId',
  },

  domain: 'domain.com',
  cognitoDomain: 'auth.domain.com', //subdomain of the main domain

  postSignupLambdaName: 'post-signup-trigger', // gets triggered after signup

  userPoolName: 'userpool',
  userPoolClientName: 'userpool-client',

  identityPoolName: 'identitypool', // for google / facebook login (we link to userPool to create account)

  // 2 roles
  authenticatedUserName: 'auth-role',
  unAuthenticatedUserName: 'unauth-role',

  // confirmation email
  email: {
    subject: 'Account Verification',
    body: `Welcome to domain!
Click on the link to verify your email {##Verify Email##}`,
    from: 'noreply@domain.com',
    name: 'domain',
    replyTo: 'support@domain.com',
  },

  // urls that we pass in to cognito
  callbackUrls: [
    'https://domain.com',
    'https://domain.com/design',
    'https://domain.com/checkout',
  ],
  logoutUrls: [
    //
    'https://domain.com',
    'https://domain.com/design',
    'https://domain.com/checkout',
    'https://domain.com/login',
  ],
  redirectUri: 'https://domain.com/', // redirect after login
};

/*

Identity pool 

For login with Facebook and Google. We link it to userpool. So people also actually create an account. Because when users are auth with Google or Facebook in the userpool by default they are not a user. They are just auth by confedered login

*/

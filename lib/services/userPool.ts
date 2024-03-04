import * as cdk from 'aws-cdk-lib';
import * as cognito from 'aws-cdk-lib/aws-cognito';

interface IUserPoolProps {
  userPoolName: string;
  email: {
    subject: string;
    body: string;
    from: string;
    name: string;
    replyTo: string;
  };
  domain: string;
  lambdaFunction: any;
  key: any;
}

export const UserPool = (stack: cdk.Stack, props: IUserPoolProps) => {
  const userPool = new cognito.UserPool(stack, 'UserPool', {
    userPoolName: props.userPoolName,
    selfSignUpEnabled: true, // not only the admin can add users
    standardAttributes: {
      email: { required: true },
      givenName: { required: true },
      familyName: { required: true },
      birthdate: { required: false },
      address: { required: false },
      middleName: { required: false },
      phoneNumber: { required: false },
    },
    customAttributes: {
      // extra attributes
      business_account: new cognito.BooleanAttribute({ mutable: true }),
      company_name: new cognito.StringAttribute({
        mutable: true,
        minLen: 1,
        maxLen: 25,
      }),
      vat_nr: new cognito.StringAttribute({
        mutable: true,
        minLen: 4,
        maxLen: 15,
      }),
    },
    signInAliases: {
      // you can signin with usersname or email
      email: true,
      username: true,
    },
    autoVerify: {
      email: true,
    },
    userVerification: {
      // email verification with a link
      emailStyle: cognito.VerificationEmailStyle.LINK,
      emailSubject: props.email.subject,
      emailBody: props.email.body,
    },
    email: cognito.UserPoolEmail.withSES({
      // email is send with SES
      sesRegion: cdk.Aws.REGION,
      sesVerifiedDomain: props.domain,
      fromEmail: props.email.from,
      fromName: props.email.name,
      replyTo: props.email.replyTo,
    }),
    passwordPolicy: {
      minLength: 12,
      requireLowercase: true,
      requireUppercase: true,
      requireDigits: true,
      requireSymbols: true,
      tempPasswordValidity: cdk.Duration.days(365),
    },
    accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,

    // which lambda gets triggered after signup?
    lambdaTriggers: {
      postConfirmation: props.lambdaFunction,
    },
    customSenderKmsKey: props.key,
    removalPolicy: cdk.RemovalPolicy.DESTROY, // change for production
  });

  return userPool;
};

/* eslint-disable max-statements */
/* eslint-disable max-lines */

// types
import { IAwsCognitoStackProps } from '../bin/types';

// imports
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { Table } from 'aws-cdk-lib/aws-dynamodb';
import { Key } from 'aws-cdk-lib/aws-kms';

import { Certificate } from 'aws-cdk-lib/aws-certificatemanager';
import { Secret } from 'aws-cdk-lib/aws-secretsmanager';
import { HostedZone } from 'aws-cdk-lib/aws-route53';

import { Duration, Stack } from 'aws-cdk-lib';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';
// import { NagSuppressions } from 'cdk-nag';

import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Runtime } from 'aws-cdk-lib/aws-lambda';

import {
  UserPoolIdentityProviderGoogle,
  UserPoolIdentityProviderFacebook,
  ProviderAttribute,
  UserPoolClient,
  OAuthScope,
  UserPoolClientIdentityProvider,
  CfnIdentityPool,
  CfnIdentityPoolRoleAttachment,
} from 'aws-cdk-lib/aws-cognito';

import { PolicyStatement, Effect } from 'aws-cdk-lib/aws-iam';

import * as route53 from 'aws-cdk-lib/aws-route53';
import * as route53_targets from 'aws-cdk-lib/aws-route53-targets';

import { UserPool } from './services//userPool';
import { createRole } from './services/createRole';
import { AuthPolicies } from './services/authPolicies';
import { UnAuthPolicies } from './services/unAuthPolicies';

export class AwsCognitoStack extends Stack {
  constructor(scope: Construct, id: string, props: IAwsCognitoStackProps) {
    super(scope, id, props);

    const bucket = Bucket.fromBucketArn(
      this,
      'ImageBucket',
      props.imports.bucketArn
    );

    const table = Table.fromTableArn(
      this,
      'AccountTable',
      props.imports.tableArn
    );
    const key = Key.fromKeyArn(this, 'Key', props.imports.kmsKeyArn);

    const domainCertificate = Certificate.fromCertificateArn(
      this,
      'DomainCert',
      props.imports.domainCertificateArn
    );

    const googleClientSecret = Secret.fromSecretNameV2(
      this,
      'GoogleClientSecret',
      props.imports.googleSecretName
    );

    const facebookClientSecret = Secret.fromSecretNameV2(
      this,
      'FacebookClientSecret',
      props.imports.facebookSecretName
    );
    /* AWS Route53 Hosted Zone. */
    const hostedZone = HostedZone.fromHostedZoneAttributes(this, 'HostedZone', {
      hostedZoneId: props.imports.hostedZoneId,
      zoneName: props.domain,
    });

    /*----------------------------------------------------------------------------- */

    // create lambda that is triggered after signing up
    // after the signup is completed this lambda will run
    const postSignupLambda = new NodejsFunction(this, 'SignupTrigger', {
      functionName: props.postSignupLambdaName,

      bundling: { minify: true },
      entry: 'src/index.ts',
      runtime: Runtime.NODEJS_18_X,
      timeout: Duration.minutes(2),

      environment: {
        BUCKET_NAME: bucket.bucketName,
        TABLE_NAME: table.tableName,
      },
      logRetention: RetentionDays.TWO_MONTHS,
    });

    // create cloudWatchPoliy
    const cloudWatchPolicy = new PolicyStatement({
      actions: ['cloudwatch:PutMetricData'],
      effect: Effect.ALLOW,
      resources: ['*'],
    });

    // pass in the cloudWatchPolicy
    postSignupLambda.addToRolePolicy(cloudWatchPolicy);

    bucket.grantWrite(postSignupLambda);
    table.grantReadWriteData(postSignupLambda);
    key.grantEncryptDecrypt(postSignupLambda);

    /* AWS COGNITO USERPOOL */

    // create userPool later we add google and facebook to userPool

    const userPool = UserPool(this, {
      userPoolName: props.userPoolName,
      email: {
        subject: props.email.subject,
        body: props.email.body,
        from: props.email.from,
        name: props.email.name,
        replyTo: props.email.replyTo,
      },
      domain: props.domain,
      lambdaFunction: postSignupLambda,
      key,
    });

    /* GOOGLE LOGIN */
    // create google user pool identity
    // pass in the googleSecret we get above
    const googleLogin = new UserPoolIdentityProviderGoogle(
      this,
      'GoogleLogin',
      {
        userPool,
        //
        clientId: googleClientSecret
          .secretValueFromJson('id')
          .unsafeUnwrap()
          .toString(),

        clientSecretValue: googleClientSecret.secretValueFromJson('secret'),
        //
        scopes: ['profile', 'email', 'openid'],
        attributeMapping: {
          email: ProviderAttribute.GOOGLE_EMAIL,
          givenName: ProviderAttribute.GOOGLE_GIVEN_NAME,
          familyName: ProviderAttribute.GOOGLE_FAMILY_NAME,
          birthdate: ProviderAttribute.GOOGLE_BIRTHDAYS,
          // no middlename (facebook has)
        },
      }
    );

    /* FACEBOOK LOGIN */
    // create Facebook later we add it to the userPool

    // pass in the facebook secret we 'get' above
    const facebookLogin = new UserPoolIdentityProviderFacebook(
      this,
      'FacebookLogin',
      {
        userPool,
        //
        clientId: facebookClientSecret
          .secretValueFromJson('id')
          .unsafeUnwrap()
          .toString(),
        clientSecret: facebookClientSecret
          .secretValueFromJson('secret')
          .unsafeUnwrap()
          .toString(),
        //
        scopes: ['public_profile', 'email', 'user_birthday'],
        attributeMapping: {
          email: ProviderAttribute.FACEBOOK_EMAIL,
          givenName: ProviderAttribute.FACEBOOK_FIRST_NAME,
          familyName: ProviderAttribute.FACEBOOK_LAST_NAME,
          birthdate: ProviderAttribute.FACEBOOK_BIRTHDAY,
          middleName: ProviderAttribute.FACEBOOK_MIDDLE_NAME,
        },
      }
    );

    userPool.registerIdentityProvider(googleLogin);
    userPool.registerIdentityProvider(facebookLogin);

    /* AWS COGNITO USERPOOLCLIENT */
    // create client for userPool

    const userpoolClient = new UserPoolClient(this, 'UserPoolClient', {
      userPool,
      userPoolClientName: props.userPoolClientName,
      oAuth: {
        flows: {
          authorizationCodeGrant: true,
        },
        scopes: [
          OAuthScope.PROFILE,
          OAuthScope.EMAIL,
          OAuthScope.OPENID,
          OAuthScope.PHONE,
          OAuthScope.COGNITO_ADMIN,
        ],
        callbackUrls: props.callbackUrls,
        logoutUrls: props.logoutUrls,
      },
      supportedIdentityProviders: [
        UserPoolClientIdentityProvider.COGNITO,
        UserPoolClientIdentityProvider.GOOGLE,
        UserPoolClientIdentityProvider.FACEBOOK,
      ],
      accessTokenValidity: Duration.minutes(60),
      idTokenValidity: Duration.minutes(60),
      refreshTokenValidity: Duration.days(30),
      preventUserExistenceErrors: true,
      enableTokenRevocation: true,
    });

    // add (register) Google and Facebook to userPoolClient
    userpoolClient.node.addDependency(googleLogin, facebookLogin);

    /* AWS COGNITO IDENTITYPOOL */
    // create identityPool

    const identityPool = new CfnIdentityPool(this, 'IdentityPool', {
      identityPoolName: props.identityPoolName,
      allowUnauthenticatedIdentities: true,
      cognitoIdentityProviders: [
        {
          clientId: userpoolClient.userPoolClientId,
          providerName: userPool.userPoolProviderName,
        },
      ],
    });

    // ROLE //

    const authenticatedUserRole = createRole(this, {
      name: props.authenticatedUserName,
      identityPoolRef: identityPool.ref,
      state: 'authenticated',
    });

    const unAuthenticatedUserRole = createRole(this, {
      name: props.unAuthenticatedUserName,
      identityPoolRef: identityPool.ref,
      state: 'unauthenticated',
    });

    AuthPolicies({ bucket, bucketKey: key, authenticatedUserRole });
    UnAuthPolicies({ bucket, bucketKey: key, unAuthenticatedUserRole });

    // Add roles to identity pool.
    new CfnIdentityPoolRoleAttachment(this, 'IdentityPoolRoleAttachment', {
      identityPoolId: identityPool.ref,
      roles: {
        authenticated: authenticatedUserRole.roleArn,
        unauthenticated: unAuthenticatedUserRole.roleArn,
      },
    });

    /* AWS ACM Domain Certificate in us-east-1. */

    // Add personal domain to Cognito instead of using the by Cognito provided domain.

    // insert the domainCert that we have 'get' on top
    const domain = userPool.addDomain('CustomDomain', {
      customDomain: {
        domainName: props.cognitoDomain,
        certificate: domainCertificate,
      },
    });

    /* AWS Route53 A Record. */

    // pass in the hostedZone we 'get' on top
    new route53.ARecord(this, 'UserPoolCloudFrontAliasRecord', {
      zone: hostedZone,
      recordName: props.cognitoDomain,
      target: route53.RecordTarget.fromAlias(
        new route53_targets.UserPoolDomainTarget(domain)
      ),
    });

    // Nag Security Suppressions. TODO's.
    // NagSuppressions.addStackSuppressions(this, [
    //   {
    //     id: 'AwsSolutions-COG2',
    //     reason: 'MFA requirement not active at this point.',
    //   },
    //   {
    //     id: 'AwsSolutions-COG3',
    //     reason: 'AdvancedSecurityMode not active at this point.',
    //   },
    //   {
    //     id: 'AwsSolutions-IAM4',
    //     reason:
    //       'AWSLambdaBasicExecutionRole is required for the function to write logs to CloudWatch.',
    //     appliesTo: [
    //       'Policy::arn:<AWS::Partition>:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole',
    //     ],
    //   },
    //   {
    //     id: 'AwsSolutions-IAM5',
    //     reason:
    //       'Wildcard permissions are necessary for these actions on S3 bucket and KMS key.',
    //     appliesTo: [
    //       'Action::kms:ReEncrypt*',
    //       'Action::kms:GenerateDataKey*',
    //       'Action::s3:Abort*',
    //       'Action::s3:DeleteObject*',
    //       'Resource::arn:aws:s3:::ph-images-bucket/*',
    //       'Resource::arn:aws:s3:::ph-images-bucket/users/<cognito-identity.amazonaws.com:sub>/*',
    //       'Resource::*',
    //     ],
    //   },
    //   {
    //     id: 'AwsSolutions-COG7',
    //     reason: 'Allowing both auth and unauth users.',
    //   },
    //   {
    //     id: 'CdkNagValidationFailure',
    //     reason: 'Custom resource uses other node version.',
    //   },
    //   {
    //     id: 'AwsSolutions-L1',
    //     reason: 'Custom resource uses other node version.',
    //   },
    // ]);
  }
}

#!/usr/bin/env node
import 'source-map-support/register';
import { App } from 'aws-cdk-lib';
import { AwsCognitoStack } from '../lib/aws-cognito-stack';
import { stackConfig } from './config';

const app = new App();
new AwsCognitoStack(app, 'cognito-stack', stackConfig);

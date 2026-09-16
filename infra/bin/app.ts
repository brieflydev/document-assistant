#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { DocumentAssistantStack } from "../lib/document-assistant-stack";

const app = new cdk.App();

const githubOwner = app.node.tryGetContext("githubOwner") as string | undefined;
const githubRepo = app.node.tryGetContext("githubRepo") as string | undefined;

new DocumentAssistantStack(app, "DocumentAssistantStack", {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION ?? "us-east-1",
  },
  githubOwner: githubOwner ?? "brieflydev",
  githubRepo: githubRepo ?? "document-assistant",
  description: "Document Assistant demo: S3 + Bedrock KB + ECS Fargate",
});

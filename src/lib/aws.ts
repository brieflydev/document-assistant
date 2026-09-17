import { BedrockAgentClient } from "@aws-sdk/client-bedrock-agent";
import { BedrockAgentRuntimeClient } from "@aws-sdk/client-bedrock-agent-runtime";
import { S3Client } from "@aws-sdk/client-s3";
import { getAppConfig } from "@/lib/config";

function region() {
  return getAppConfig()?.region ?? process.env.AWS_REGION ?? "us-east-1";
}

let s3Client: S3Client | undefined;
let bedrockAgentClient: BedrockAgentClient | undefined;
let bedrockAgentRuntimeClient: BedrockAgentRuntimeClient | undefined;

export function getS3Client() {
  s3Client ??= new S3Client({ region: region() });
  return s3Client;
}

export function getBedrockAgentClient() {
  bedrockAgentClient ??= new BedrockAgentClient({ region: region() });
  return bedrockAgentClient;
}

export function getBedrockAgentRuntimeClient() {
  bedrockAgentRuntimeClient ??= new BedrockAgentRuntimeClient({
    region: region(),
  });
  return bedrockAgentRuntimeClient;
}

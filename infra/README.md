# Document Assistant infrastructure

AWS CDK (TypeScript) stack for the workshop app.

## What it creates

- S3 bucket for uploaded documents (`documents/` prefix)
- S3 Vectors bucket + index (Bedrock Knowledge Base vector store)
- Bedrock Knowledge Base + S3 data source (with foundation-model parsing)
- ECR repository `document-assistant`
- VPC (public subnets only, no NAT), ECS Fargate service, ALB
  - Image: `document-assistant:latest` from ECR (port 3000)
  - Health check: `GET /api/health`
  - Env: `DOCUMENTS_BUCKET`, `DOCUMENTS_PREFIX`, `KNOWLEDGE_BASE_ID`, `DATA_SOURCE_ID`, `BEDROCK_MODEL_ARN`, `HOSTNAME=0.0.0.0`
- GitHub Actions OIDC provider + deploy role

> **Note:** Vector storage uses **Amazon S3 Vectors** instead of OpenSearch Serverless to keep workshop cost low.

> **First deploy:** push an image to ECR before (or immediately after) the ECS service starts, otherwise tasks fail to pull `latest`. CI will build/push via `scripts/push-ecr-image.sh`.


## Commands

```bash
cd infra
npm install
npx cdk synth
npx cdk deploy
```

Requires CDK bootstrap in the target account/region (`npx cdk bootstrap`) and Bedrock model access enabled for:

- `amazon.titan-embed-text-v2:0`
- `anthropic.claude-sonnet-4-20250514-v1:0`
- `anthropic.claude-haiku-4-5-20251001-v1:0`

# Document Assistant

Next.js demo app for uploading documents and asking questions with citations.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Current status

- Upload UI for `.md`, `.txt`, `.pdf`, and images
- Chat window with citation chips
- AWS-backed APIs when env vars are set (S3 upload, KB ingestion, RetrieveAndGenerate)
- Local stub mode when AWS env vars are missing
- Health check: `GET /api/health`
- CDK infra in [`infra/`](infra/) (S3, Bedrock KB via S3 Vectors, ECR, ECS/ALB, GitHub OIDC)

## Container

Multi-stage [`Dockerfile`](Dockerfile) builds the Next.js standalone server.

Image is pushed to ECR (`document-assistant:latest`) by CI. ECS runs it on port **3000** with ALB health check **`/api/health`**.

Because Docker cannot run on this workstation, validate with `npm run build` locally and build/push the image from GitHub Actions (or any remote Docker host):

```bash
./scripts/push-ecr-image.sh
```

## Manual test fixtures

Reusable upload samples (`.md`, `.txt`, `.pdf`, `.png`) plus suggested questions live in [`fixtures/manual-tests/`](fixtures/manual-tests/).

## CI/CD

- [`ci.yml`](.github/workflows/ci.yml) — lint, build, CDK synth
- [`deploy.yml`](.github/workflows/deploy.yml) — OIDC deploy to AWS

See [`.github/workflows/README.md`](.github/workflows/README.md) for the one-time `AWS_ROLE_ARN` setup.

## Live demo

- App: https://document-assistant.briefly-learn.com
- Health: https://document-assistant.briefly-learn.com/api/health
- Repo: https://github.com/brieflydev/document-assistant

Tear down when finished: `cd infra && npx cdk destroy --force`


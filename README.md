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
- Stub APIs (in-memory) — AWS wiring comes next
- Health check: `GET /api/health`
- CDK infra in [`infra/`](infra/) (S3, Bedrock KB via S3 Vectors, ECR, ECS/ALB, GitHub OIDC)

# GitHub Actions

## Workflows

| Workflow | Trigger | Purpose |
|---|---|---|
| [`ci.yml`](ci.yml) | PR + push to `main` | Lint, `next build`, `cdk synth` |
| [`deploy.yml`](deploy.yml) | Push to `main` + manual | OIDC → CDK deploy → ECR push → ECS rollout → health check |

## One-time setup

1. **Bootstrap infra locally** (creates the GitHub OIDC deploy role + ECR):

```bash
cd infra
npx cdk bootstrap aws://565393069879/us-east-1
npx cdk deploy -c usePlaceholderImage=true
```

2. In the GitHub repo: **Settings → Secrets and variables → Actions → Variables**

| Variable | Value |
|---|---|
| `AWS_ROLE_ARN` | `arn:aws:iam::565393069879:role/document-assistant-github-deploy` |

3. Push to `main` (or run **Deploy** via `workflow_dispatch`). CI builds/pushes via [`scripts/push-ecr-image.sh`](../../scripts/push-ecr-image.sh) and rolls ECS to `/api/health`.

GitHub may emit unique-ID subject claims (`repo:owner@id/repo@id:...`). Those IDs are configured in [`infra/cdk.json`](../../infra/cdk.json) as `githubOwnerId` / `githubRepoId`.

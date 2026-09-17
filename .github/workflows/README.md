# GitHub Actions

## Workflows

| Workflow | Trigger | Purpose |
|---|---|---|
| [`ci.yml`](ci.yml) | PR + push to `main` | Lint, `next build`, `cdk synth` |
| [`deploy.yml`](deploy.yml) | After **CI succeeds** on `main`, or manual dispatch | OIDC → CDK deploy → ECR push → ECS rollout → HTTPS health check |

Deploy does **not** run on push directly. It listens for `workflow_run` of CI and skips when CI fails.

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

3. Push to `main`. CI runs first; Deploy starts only if CI is green. Image build/push uses [`scripts/push-ecr-image.sh`](../../scripts/push-ecr-image.sh).

GitHub may emit unique-ID subject claims (`repo:owner@id/repo@id:...`). Those IDs are configured in [`infra/cdk.json`](../../infra/cdk.json) as `githubOwnerId` / `githubRepoId`.

## HTTPS

Production URL: `https://document-assistant.briefly-learn.com`

Uses the existing ACM certificate `*.briefly-learn.com` and Route53 zone `briefly-learn.com`.

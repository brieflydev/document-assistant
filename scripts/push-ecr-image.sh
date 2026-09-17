#!/usr/bin/env bash
# Build and push the app image to ECR.
# Used by GitHub Actions deploy.yml and for manual pushes from a Docker host.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
AWS_REGION="${AWS_REGION:-us-east-1}"
ECR_REPOSITORY="${ECR_REPOSITORY:-document-assistant}"
IMAGE_TAG="${IMAGE_TAG:-latest}"

ACCOUNT_ID="$(aws sts get-caller-identity --query Account --output text)"
REPO_URI="${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPOSITORY}"

echo "Logging in to ECR ${AWS_REGION}..."
aws ecr get-login-password --region "${AWS_REGION}" \
  | docker login --username AWS --password-stdin "${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"

echo "Building ${REPO_URI}:${IMAGE_TAG}..."
docker build \
  -t "${REPO_URI}:${IMAGE_TAG}" \
  -t "${REPO_URI}:latest" \
  "${ROOT_DIR}"

echo "Pushing ${REPO_URI}:${IMAGE_TAG} and :latest..."
docker push "${REPO_URI}:${IMAGE_TAG}"
docker push "${REPO_URI}:latest"

echo "Image pushed: ${REPO_URI}:${IMAGE_TAG}"
echo "Image pushed: ${REPO_URI}:latest"

if [[ -n "${GITHUB_ENV:-}" ]]; then
  echo "IMAGE_URI=${REPO_URI}" >> "${GITHUB_ENV}"
fi

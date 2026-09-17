#!/usr/bin/env bash
# Build and push the app image to ECR.
# Intended for CI (GitHub Actions). Requires Docker and AWS CLI.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
AWS_REGION="${AWS_REGION:-us-east-1}"
IMAGE_TAG="${IMAGE_TAG:-latest}"

ACCOUNT_ID="$(aws sts get-caller-identity --query Account --output text)"
REPO_URI="${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/document-assistant"

echo "Logging in to ECR ${AWS_REGION}..."
aws ecr get-login-password --region "${AWS_REGION}" \
  | docker login --username AWS --password-stdin "${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"

echo "Building ${REPO_URI}:${IMAGE_TAG}..."
docker build -t "${REPO_URI}:${IMAGE_TAG}" "${ROOT_DIR}"

echo "Pushing ${REPO_URI}:${IMAGE_TAG}..."
docker push "${REPO_URI}:${IMAGE_TAG}"

echo "Image pushed: ${REPO_URI}:${IMAGE_TAG}"

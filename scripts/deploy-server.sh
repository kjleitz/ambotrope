#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
INFRA_DIR="${ROOT_DIR}/infra"
SERVICE_NAME="${SERVICE_NAME:-$(terraform -chdir="${INFRA_DIR}" output -raw container_service_name)}"

echo "Building image..."
docker build --platform linux/amd64 \
  -f "${ROOT_DIR}/apps/server/Dockerfile" \
  -t "${SERVICE_NAME}:latest" \
  "${ROOT_DIR}"

echo "Pushing image to Lightsail..."
# push-container-image prints the image reference (e.g. :ambotrope-server.server.3)
# to stderr. Capture it.
PUSH_OUTPUT=$(aws lightsail push-container-image \
  --service-name "${SERVICE_NAME}" \
  --label server \
  --image "${SERVICE_NAME}:latest" 2>&1)

IMAGE_REF=$(echo "${PUSH_OUTPUT}" | grep -o ':[^ ]*\.server\.[0-9]*' | head -1)

if [[ -z "${IMAGE_REF}" ]]; then
  echo "Failed to parse image reference from push output:" >&2
  echo "${PUSH_OUTPUT}" >&2
  exit 1
fi

echo "Creating deployment with image: ${IMAGE_REF}"
aws lightsail create-container-service-deployment \
  --service-name "${SERVICE_NAME}" \
  --containers "{
    \"server\": {
      \"image\": \"${IMAGE_REF}\",
      \"ports\": {\"3000\": \"HTTP\"},
      \"environment\": {
        \"NODE_ENV\": \"production\",
        \"PORT\": \"3000\",
        \"CORS_ORIGIN\": \"https://www.ambotrope.com,https://ambotrope.com\"
      }
    }
  }" \
  --public-endpoint "{
    \"containerName\": \"server\",
    \"containerPort\": 3000,
    \"healthCheck\": {
      \"path\": \"/health\",
      \"intervalSeconds\": 10,
      \"healthyThreshold\": 2,
      \"unhealthyThreshold\": 3
    }
  }"

echo "Deployment created. Lightsail is rolling out the new version."

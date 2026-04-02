#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
INFRA_DIR="${ROOT_DIR}/infra"

HOST="${LIGHTSAIL_HOST:-$(terraform -chdir="${INFRA_DIR}" output -raw lightsail_static_ip)}"
IMAGE_URI="${IMAGE_URI:-$(terraform -chdir="${INFRA_DIR}" output -raw server_image)}"
SSH_USER="${SSH_USER:-ubuntu}"

echo "Building Docker image: ${IMAGE_URI}"
docker build -f "${ROOT_DIR}/apps/server/Dockerfile" -t "${IMAGE_URI}" "${ROOT_DIR}"

echo "Pushing image..."
docker push "${IMAGE_URI}"

echo "Deploying to ${HOST}..."
ssh "${SSH_USER}@${HOST}" "sudo docker pull ${IMAGE_URI} && sudo systemctl restart ambotrope && sudo systemctl status ambotrope --no-pager"

echo "Done."

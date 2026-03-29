#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

: "${IMAGE_URI:?Set IMAGE_URI to the container image configured in infra/server_image.}"

docker build -f "${ROOT_DIR}/apps/server/Dockerfile" -t "${IMAGE_URI}" "${ROOT_DIR}"

if [[ "${PUSH_IMAGE:-1}" == "1" ]]; then
  docker push "${IMAGE_URI}"
fi

if [[ -n "${LIGHTSAIL_HOST:-}" ]]; then
  ssh "${SSH_USER:-ubuntu}@${LIGHTSAIL_HOST}" "sudo systemctl restart ambotrope && sudo systemctl status ambotrope --no-pager"
fi

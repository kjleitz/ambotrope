#!/usr/bin/env bash

set -euo pipefail

INFRA_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/infra"

HOST="${LIGHTSAIL_HOST:-$(terraform -chdir="${INFRA_DIR}" output -raw lightsail_static_ip)}"
SSH_USER="${SSH_USER:-ubuntu}"

exec ssh "${SSH_USER}@${HOST}" "$@"

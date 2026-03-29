#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
INFRA_DIR="${ROOT_DIR}/infra"

BUCKET="${BUCKET:-$(terraform -chdir="${INFRA_DIR}" output -raw web_bucket_name)}"
DISTRIBUTION_ID="${DISTRIBUTION_ID:-$(terraform -chdir="${INFRA_DIR}" output -raw cloudfront_distribution_id)}"

pnpm --dir "${ROOT_DIR}" --filter @ambotrope/web build
aws s3 sync "${ROOT_DIR}/apps/web/dist/" "s3://${BUCKET}" --delete
aws cloudfront create-invalidation --distribution-id "${DISTRIBUTION_ID}" --paths "/*"

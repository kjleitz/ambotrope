#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
INFRA_DIR="${ROOT_DIR}/infra"

IMAGE_URI="${IMAGE_URI:-$(terraform -chdir="${INFRA_DIR}" output -raw server_image)}"
ACTIVATION_ID="${SSM_ACTIVATION_ID:-$(terraform -chdir="${INFRA_DIR}" output -raw ssm_activation_id)}"

echo "Building Docker image: ${IMAGE_URI}"
docker build -f "${ROOT_DIR}/apps/server/Dockerfile" -t "${IMAGE_URI}" "${ROOT_DIR}"

echo "Pushing image..."
docker push "${IMAGE_URI}"

echo "Resolving SSM managed node for activation ${ACTIVATION_ID}..."
MANAGED_NODE_ID="$(
  aws ssm describe-instance-information \
    --filters "Key=ActivationIds,Values=${ACTIVATION_ID}" \
    --query 'InstanceInformationList[0].InstanceId' \
    --output text
)"

if [[ -z "${MANAGED_NODE_ID}" || "${MANAGED_NODE_ID}" == "None" ]]; then
  echo "Failed to resolve a managed node for activation ${ACTIVATION_ID}" >&2
  exit 1
fi

echo "Sending restart command to ${MANAGED_NODE_ID}..."
COMMAND_ID="$(
  aws ssm send-command \
    --instance-ids "${MANAGED_NODE_ID}" \
    --document-name "AWS-RunShellScript" \
    --comment "Deploy ambotrope server" \
    --parameters "{\"commands\":[\"sudo docker pull ${IMAGE_URI}\",\"sudo systemctl restart ambotrope\",\"sudo systemctl status ambotrope --no-pager\"]}" \
    --query 'Command.CommandId' \
    --output text
)"

if [[ -z "${COMMAND_ID}" || "${COMMAND_ID}" == "None" ]]; then
  echo "Failed to start the SSM deployment command" >&2
  exit 1
fi

while true; do
  STATUS="$(
    aws ssm get-command-invocation \
      --command-id "${COMMAND_ID}" \
      --instance-id "${MANAGED_NODE_ID}" \
      --query 'Status' \
      --output text 2>/dev/null || true
  )"

  case "${STATUS}" in
    Pending|InProgress|Delayed|"")
      sleep 5
      ;;
    Success)
      break
      ;;
    Cancelled|TimedOut|Failed|Cancelling)
      echo "SSM command failed with status: ${STATUS}" >&2
      aws ssm get-command-invocation \
        --command-id "${COMMAND_ID}" \
        --instance-id "${MANAGED_NODE_ID}" \
        --query '{Status:Status,StandardOutputContent:StandardOutputContent,StandardErrorContent:StandardErrorContent}' \
        --output json
      exit 1
      ;;
    *)
      echo "Unexpected SSM command status: ${STATUS}" >&2
      exit 1
      ;;
  esac
done

aws ssm get-command-invocation \
  --command-id "${COMMAND_ID}" \
  --instance-id "${MANAGED_NODE_ID}" \
  --query '{Status:Status,StandardOutputContent:StandardOutputContent,StandardErrorContent:StandardErrorContent}' \
  --output json

echo "Done."

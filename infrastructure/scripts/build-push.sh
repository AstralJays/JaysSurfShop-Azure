#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
TERRAFORM_DIR="${SCRIPT_DIR}/../container-apps/terraform"

ACR_LOGIN_SERVER="${ACR_LOGIN_SERVER:-}"
IMAGE_TAG="${IMAGE_TAG:-latest}"

if [[ -z "$ACR_LOGIN_SERVER" ]]; then
  cd "$TERRAFORM_DIR"
  ACR_LOGIN_SERVER="$(terraform output -raw acr_login_server)"
fi

NAME_PREFIX="${NAME_PREFIX:-jays-surf-shop-demo}"

declare -A CONTEXTS=(
  [frontend]="frontend"
  [chat-rag]="services/chat-rag"
  [board-generator]="services/board-generator"
)

ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

for service in frontend chat-rag board-generator; do
  context="${CONTEXTS[$service]}"
  image="${ACR_LOGIN_SERVER}/${NAME_PREFIX}/${service}:${IMAGE_TAG}"
  echo "==> Building and pushing ${image}"
  az acr login --name "${ACR_LOGIN_SERVER%%.*}" 2>/dev/null || true
  docker build -t "$image" "${ROOT}/${context}"
  docker push "$image"
done

echo "Done."

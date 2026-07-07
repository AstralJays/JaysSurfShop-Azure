#!/usr/bin/env bash
# Deploy ACR + GitHub OIDC identities only (step 1)
set -euo pipefail

PLATFORM="${1:-container-apps}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
TERRAFORM_DIR="${SCRIPT_DIR}/../${PLATFORM}/terraform"

if [[ ! -d "$TERRAFORM_DIR" ]]; then
  echo "ERROR: Unknown platform '${PLATFORM}'. Use: aks or container-apps"
  exit 1
fi

cd "$TERRAFORM_DIR"
terraform init

terraform apply \
  -target=module.workshop.azurerm_container_registry.main \
  -target=module.workshop.azurerm_user_assigned_identity.github_deploy \
  -target=module.workshop.azurerm_user_assigned_identity.github_scan \
  -target=module.workshop.azurerm_federated_identity_credential.github_deploy \
  -target=module.workshop.azurerm_federated_identity_credential.github_scan_deploy \
  -target=module.workshop.azurerm_federated_identity_credential.github_scan_external \
  -target=module.workshop.azurerm_role_assignment.github_deploy_acr_push \
  -target=module.workshop.azurerm_role_assignment.github_scan_acr_pull

echo ""
echo "Add to GitHub secrets (JaysSurfShop-Azure repo):"
echo "  AZURE_CLIENT_ID=$(terraform output -raw github_actions_deploy_client_id)"
echo "  AZURE_TENANT_ID=$(terraform output -raw github_actions_tenant_id)"
echo "  AZURE_SUBSCRIPTION_ID=$(terraform output -raw github_actions_subscription_id)"
echo "  ACR_NAME=$(terraform output -raw acr_name)"
echo "  ACR_LOGIN_SERVER=$(terraform output -raw acr_login_server)"
echo ""
echo "For manual Upwind scan workflow, also set AZURE_SCAN_CLIENT_ID to:"
terraform output -raw github_actions_scan_client_id

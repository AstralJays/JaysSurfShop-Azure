# Azure Container Apps deployment

Deploys Jay's Surf Shop on **Azure Container Apps** with:

- VNet-integrated Container Apps Environment
- Three container apps: `frontend` (external ingress), `chat-rag` and `board-generator` (internal)
- Shared user-assigned identity for ACR pull and storage access

## Prerequisites

- Azure CLI logged in (`az login`)
- Terraform >= 1.5
- Images pushed to ACR (GitHub Actions or `build-push.sh`)

## Deploy

```bash
cp terraform.tfvars.example terraform.tfvars
# edit terraform.tfvars

../../scripts/deploy-container-apps.sh
```

## Internal service URLs

Within the environment, backends are reachable at:

- `https://chat-rag.internal.<env-default-domain>`
- `https://board-generator.internal.<env-default-domain>`

Terraform sets these on the frontend container automatically.

## Workshop findings (intentional)

Same misconfigurations as the AKS path — see [aks/README.md](../aks/README.md).

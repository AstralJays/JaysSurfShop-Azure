# AKS deployment

Deploys Jay's Surf Shop on **Azure Kubernetes Service** with:

- Shared workshop module (VNet, ACR, Function, etc.)
- AKS cluster with workload identity
- Kubernetes Deployments for `frontend`, `chat-rag`, `board-generator`
- Frontend exposed via `LoadBalancer` service

## Prerequisites

- Azure CLI logged in (`az login`)
- Terraform >= 1.5
- `openai_api_key` in `terraform.tfvars`

## Deploy

```bash
cp terraform.tfvars.example terraform.tfvars
# edit terraform.tfvars

../../scripts/deploy-aks.sh
```

## Outputs

- `application_url` — frontend LoadBalancer IP
- `order_webhook_url` — Azure Function base URL
- `acr_repository_urls` — image paths for CI

## Workshop findings (intentional)

- NSG allows SSH from `0.0.0.0/0`
- Workload identity has subscription **Contributor**
- Public blob container with synthetic customer export
- Unauthenticated Azure Function (EICAR + PyYAML CVE)

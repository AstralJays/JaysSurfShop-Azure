<h1 align="center">Jay's Surf Shop — Azure</h1>

<p align="center">
  <img src="frontend/public/logo.png" alt="Jay's Surf Shop logo" width="180" />
</p>

<p align="center">
  Azure twin of <a href="https://github.com/AstralJays/JaysSurfShop">JaysSurfShop</a> — the same intentionally vulnerable surf shop for security workshops, deployable on <strong>AKS</strong> or <strong>Azure Container Apps</strong>.
</p>

<p align="center">
  <a href="https://github.com/AstralJays/JaysSurfShop-Azure">github.com/AstralJays/JaysSurfShop-Azure</a>
</p>

> [!CAUTION]
> **Do not deploy to production accounts.**

## Architecture

```
Internet → frontend (AKS LoadBalancer or Container Apps ingress)
              ├── chat-rag (private)
              └── board-generator (private)

Internet → Azure Function → order-webhook (EICAR + PyYAML CVE-2020-14343)
              ↑ checkout from cart
```

| Service | Stack | Port |
|---------|-------|------|
| **frontend** | Next.js 15 | 3000 |
| **chat-rag** | FastAPI, ChromaDB, OpenAI | 8001 |
| **board-generator** | FastAPI, image generation | 8002 |
| **order-webhook** | Python Azure Function | HTTP routes |

## Quick start (local)

Same as the AWS repo — app code is identical:

```bash
cp .env.example .env
# Set OPENAI_API_KEY
docker compose up --build
```

Open [http://localhost:3000](http://localhost:3000) · security dashboard at [/security](http://localhost:3000/security)

## Deploy to Azure

Choose **AKS** or **Container Apps**. Both share VNet, ACR, Key Vault, Storage, Function App, and GitHub OIDC via `infrastructure/modules/workshop/`.

```bash
# 1. CI bootstrap (ACR + GitHub federated credentials)
./infrastructure/scripts/apply-ci.sh container-apps   # or: aks

# 2. Add GitHub secrets (printed by apply-ci.sh):
#    AZURE_CLIENT_ID, AZURE_TENANT_ID, AZURE_SUBSCRIPTION_ID
#    ACR_NAME, ACR_LOGIN_SERVER

# 3. Run "Build and Push Images" in Actions (or build-push.sh locally)

# 4. Full stack
cp infrastructure/container-apps/terraform/terraform.tfvars.example \
   infrastructure/container-apps/terraform/terraform.tfvars
# Set openai_api_key in terraform.tfvars
./infrastructure/scripts/deploy-container-apps.sh   # or: deploy-aks.sh
```

See [infrastructure/aks/README.md](infrastructure/aks/README.md) and [infrastructure/container-apps/README.md](infrastructure/container-apps/README.md).

Workshop runbook: **[docs/WORKSHOP.md](docs/WORKSHOP.md)**

## Project structure

```
JaysSurfShop-Azure/
├── docs/WORKSHOP.md
├── infrastructure/
│   ├── modules/workshop/       # VNet, ACR, Key Vault, Storage, Function, GitHub OIDC
│   ├── aks/terraform/          # AKS + Kubernetes workloads
│   ├── container-apps/terraform/
│   ├── function/order-webhook/
│   └── scripts/
├── frontend/
├── services/
└── docker-compose.yml
```

## License

MIT

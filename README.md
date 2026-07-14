<h1 align="center">Jay's Surf Shop — Azure</h1>

<p align="center">
  <img src="frontend/public/logo.png" alt="Jay's Surf Shop logo" width="180" />
</p>

<p align="center">
  Azure twin of <a href="https://github.com/AstralJays/JaysSurfShop">JaysSurfShop</a> — same open-source <strong>POC / demo</strong> app.
  Fork or clone, deploy on <strong>AKS</strong> or <strong>Azure Container Apps</strong>, connect <strong>your</strong> security tooling, and run the built-in attacks from <code>/security</code>.
</p>

<p align="center">
  <a href="https://github.com/AstralJays/JaysSurfShop-Azure">github.com/AstralJays/JaysSurfShop-Azure</a>
</p>

> [!CAUTION]
> **Do not deploy to production accounts.**

## Architecture

```
Internet → frontend (AKS LoadBalancer or Container Apps ingress)
              ├── chat-rag (RAG + GPT-4o-mini, CVE-2023-50447)
              └── board-generator (DALL·E / gpt-image)

Internet → Azure Function → order-webhook (EICAR + PyYAML CVE-2020-14343)
              ↑ checkout from cart
```

| Service | Stack | Port / entry |
|---------|-------|--------------|
| **frontend** | Next.js 15, React, Tailwind | 3000 |
| **chat-rag** | FastAPI, ChromaDB, OpenAI, exploit lab | 8001 |
| **board-generator** | FastAPI, image generation | 8002 |
| **order-webhook** | Python Azure Function (HTTP) | `/checkout`, `/demo/*` |

## Quick start (local)

Same app as the AWS repo — identical `frontend/`, `services/`, and `docker-compose.yml`:

```bash
cp .env.example .env
# Set OPENAI_API_KEY

docker compose up --build
```

Open [http://localhost:3000](http://localhost:3000) · exploit lab at [/security](http://localhost:3000/security)

Vulnerabilities are on by default (Pillow CVE, exploit endpoints, path traversal, chat-rag on 8001). Point your tooling at the stack, then run attacks from the lab. On Azure: public blob export, overprivileged managed identities, leaked client secrets, Key Vault demo secrets, open SSH NSG rule, and anonymous Function routes (EICAR + PyYAML CVE).

**Identity attack focus:** managed identity IMDS token theft, role assignment abuse, service principal credential theft, and Key Vault → Storage lateral movement. Optional: [docs/WORKSHOP.md](docs/WORKSHOP.md).

## Deploy to Azure

Choose **Container Apps** or **AKS** — both share VNet, ACR, Key Vault, Storage, Azure Function, and GitHub OIDC via `infrastructure/modules/workshop/`.

```bash
# 1. CI bootstrap (ACR + GitHub federated credentials)
./infrastructure/scripts/apply-ci.sh container-apps   # or: aks

# 2. Add GitHub secrets (printed by apply-ci.sh):
#    AZURE_CLIENT_ID, AZURE_TENANT_ID, AZURE_SUBSCRIPTION_ID, ACR_NAME, ACR_LOGIN_SERVER

# 3. Run "Build and Push Images" in Actions (or build-push.sh locally)

# 4. Full stack
cp infrastructure/container-apps/terraform/terraform.tfvars.example \
   infrastructure/container-apps/terraform/terraform.tfvars
# Set openai_api_key in terraform.tfvars
./infrastructure/scripts/deploy-container-apps.sh   # or: deploy-aks.sh
```

See [infrastructure/aks/README.md](infrastructure/aks/README.md) and [infrastructure/container-apps/README.md](infrastructure/container-apps/README.md).

The workflow [`.github/workflows/build-push.yml`](.github/workflows/build-push.yml) builds all three images and pushes to ACR on push to `main` (or manual dispatch).

Workshop runbook: **[docs/WORKSHOP.md](docs/WORKSHOP.md)**

## Multi-cloud repos

| Cloud | Repo | Compute options |
|-------|------|-----------------|
| AWS | [JaysSurfShop](https://github.com/AstralJays/JaysSurfShop) | ECS Fargate, EKS |
| Azure | **JaysSurfShop-Azure** | Container Apps, AKS |
| GCP | [JaysSurfShop-GCP](https://github.com/AstralJays/JaysSurfShop-GCP) | Cloud Run, GKE |

## Project structure

```
JaysSurfShop-Azure/
├── docs/WORKSHOP.md
├── infrastructure/
│   ├── modules/workshop/        # VNet, ACR, Key Vault, Storage, Function, GitHub OIDC
│   ├── aks/terraform/           # AKS + Kubernetes workloads
│   ├── container-apps/terraform/
│   ├── function/order-webhook/  # checkout Function (EICAR + PyYAML CVE)
│   └── scripts/                 # apply-ci, deploy-aks/container-apps, build-push
├── frontend/
├── services/
└── docker-compose.yml
```

## License

MIT

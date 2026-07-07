# Jay's Surf Shop — Azure workshop

Azure counterpart to [JaysSurfShop](https://github.com/AstralJays/JaysSurfShop). Same demo narrative: CSPM misconfigs, container runtime, AI usage, serverless vulns.

## Deploy paths

| Path | Compute | Ingress |
|------|---------|---------|
| **Container Apps** | Serverless containers | ACA ingress (recommended for quick demos) |
| **AKS** | Managed Kubernetes | LoadBalancer service |

## Demo flow (high level)

1. Deploy shared workshop module + chosen compute path
2. Push images via GitHub Actions (ACR)
3. Browse shop + `/security` dashboard
4. Show intentional findings: public blob export, overprivileged managed identity, open SSH NSG, anonymous Function routes

See the AWS repo's [WORKSHOP.md](https://github.com/AstralJays/JaysSurfShop/blob/main/docs/WORKSHOP.md) for the full act structure — adapt AWS-specific steps (ECS task role → workload identity / ACA identity, S3 → Blob Storage, API Gateway → Function App).

# Jay's Surf Shop — Azure workshop

Azure counterpart to [JaysSurfShop](https://github.com/AstralJays/JaysSurfShop). Same demo narrative: CSPM misconfigs, container runtime, AI usage, serverless vulns — with **identity-first Cloud XDR** paths specific to Microsoft Entra ID, managed identities, and Azure RBAC.

## Deploy paths

| Path | Compute | Ingress |
|------|---------|---------|
| **Container Apps** | Serverless containers | ACA ingress (recommended for quick demos) |
| **AKS** | Managed Kubernetes | LoadBalancer service |

## Identity-first Cloud XDR kill chain (recommended)

Real Azure compromises usually pivot through **identities**, not service CVEs. Run PoCs from `/security` in this order:

### Act 1 — Initial access (Container Runtime tab)

1. **Pillow RCE** — proves code execution in `chat-rag`
2. **IMDS token theft** — curls `169.254.169.254` (or ACA identity endpoint) for managed identity OAuth token

```bash
curl -H Metadata:true \
  "http://169.254.169.254/metadata/identity/oauth2/token?api-version=2018-02-01&resource=https://management.azure.com/"
```

### Act 2 — Post-compromise identity abuse (Cloud XDR tab)

| Rank | PoC | MITRE | Activity Log signal |
|------|-----|-------|---------------------|
| 1 | **Managed identity token theft** | T1552.005 / T1528 | Unusual MI token usage |
| 2 | **Post-compromise data access** | T1078 | Key Vault + Storage + ARM reads from workload |
| 3 | **Service principal credential theft** | T1552 | Leaked client secret → `az login --service-principal` |
| 4 | **Role assignment abuse (UAA)** | T1098 | `Microsoft.Authorization/roleAssignments/write` |
| 5 | **Key Vault secrets theft** | T1552 | Secret Get spikes |
| 6 | **MI → Key Vault → Storage chain** | T1078 | Lateral movement without CVEs |
| 7 | **Blob exfiltration** | CWE-200 | Storage enumeration |

### Act 3 — Malware + AI (same as AWS/GCP twins)

- Function App EICAR + PyYAML CVE
- Unauthenticated AI chat + RAG reindex

## Terraform misconfigurations (always on)

| Finding | Resource | Purpose |
|---------|----------|---------|
| Contributor on subscription | Workload managed identity | IMDS token → full ARM abuse |
| User Access Administrator | Dev service principal | Role assignment privilege escalation |
| Leaked SP client secret | Public blob + container mount | Credential theft demo |
| Key Vault secrets | `workshop-db-password`, `workshop-api-key`, `workshop-storage-key` | Secrets Officer demo |
| Public blob container | Synthetic PII + leaked SP JSON | CSPM + exfil narrative |

Identity resources: `infrastructure/modules/workshop/identity.tf`

## Deploy

```bash
# 1. CI bootstrap
./infrastructure/scripts/apply-ci.sh container-apps   # or: aks

# 2. GitHub secrets from apply-ci output

# 3. Build images (Actions or build-push.sh)

# 4. Full stack
cp infrastructure/container-apps/terraform/terraform.tfvars.example \
   infrastructure/container-apps/terraform/terraform.tfvars
./infrastructure/scripts/deploy-container-apps.sh   # or: deploy-aks.sh
```

After deploy, open the frontend URL → **Security** dashboard → run the kill chain above.

See [infrastructure/aks/README.md](../infrastructure/aks/README.md) and [infrastructure/container-apps/README.md](../infrastructure/container-apps/README.md).

import { NextResponse } from "next/server";
import { proxyChat } from "@/lib/demoLab";
import { ORDER_WEBHOOK_URL, proxyOrderWebhook, type OrderWebhookStatus } from "@/lib/orderWebhook";

function detectCompute(): string {
  if (process.env.KUBERNETES_SERVICE_HOST) return "aks";
  if (process.env.CONTAINER_APP_NAME) return "container-apps";
  if (process.env.AZURE_REGION) return "azure";
  return "container";
}

const BASE = {
  application: "jays-surf-shop",
  environment: process.env.NEXT_PUBLIC_APP_ENV || process.env.ENVIRONMENT || "local",
  deployment_id: process.env.DEPLOYMENT_ID || "local",
  compute: detectCompute(),
  attack_surface: {
    public: [
      { path: "/", note: "Shop catalog" },
      { path: "/chat", note: "Shop Crew UI" },
      { path: "/design", note: "Create-A-Board UI" },
      { path: "/api/chat", note: "Unauthenticated → OpenAI" },
      { path: "/api/board", note: "Unauthenticated → image gen" },
      { path: "/api/checkout", note: "Cart checkout → order webhook (fulfillmentManifest YAML chain when poisoned)" },
      { path: "/api/security/posture", note: "Posture metadata" },
      { path: "/api/security/demo/*", note: "PoC proxy" },
    ],
    private: [
      { path: "chat-rag:8001/chat", note: "RAG + GPT-4o-mini" },
      { path: "chat-rag:8001/demo/exploit/*", note: "Exploit lab" },
      { path: "chat-rag:8001/reindex", note: "Unauthenticated admin (local compose)" },
      { path: "board-generator:8002/generate", note: "DALL·E / gpt-image" },
    ],
    external: ["openai-api"],
    secrets: ["openai-api-key (Key Vault on Azure)"],
  },
};

interface DemoStatus {
  azure_runtime?: boolean;
  pillow_installed?: string | null;
  identity_attack_paths?: Record<string, boolean>;
}

function buildFindings(
  env: string,
  demo: DemoStatus,
  orderWebhook: OrderWebhookStatus | null,
  orderWebhookConfigured: boolean
) {
  const azure =
    demo.azure_runtime === true ||
    orderWebhook?.azure_runtime === true ||
    Boolean(process.env.AZURE_REGION || process.env.AZURE_CLIENT_ID || process.env.KUBERNETES_SERVICE_HOST);
  const local = env === "local" || env === "demo-local";
  const pillow = demo.pillow_installed ?? null;
  const pyyaml = orderWebhook?.pyyaml_version ?? null;

  const cves = [];
  if (pillow) {
    cves.push({
      cve: "CVE-2023-50447",
      package: `pillow ${pillow}`,
      severity: "HIGH",
      service: "chat-rag",
      active: true,
      exploitable: true,
    });
  }
  if (pyyaml && orderWebhookConfigured) {
    cves.push({
      cve: "CVE-2020-14343",
      package: `pyyaml ${pyyaml}`,
      severity: "HIGH",
      service: "order-webhook",
      active: true,
      exploitable: true,
    });
  }

  const attackSurfacePublic = [...BASE.attack_surface.public];
  if (orderWebhookConfigured) {
    attackSurfacePublic.push({
      path: ORDER_WEBHOOK_URL,
      note: "Public Azure Function HTTPS URL — no auth (CSPM finding)",
    });
    attackSurfacePublic.push({
      path: `${ORDER_WEBHOOK_URL}/checkout`,
      note: "Unauthenticated checkout → order webhook Function; fulfillmentManifest triggers PyYAML kill chain",
    });
    attackSurfacePublic.push({
      path: `${ORDER_WEBHOOK_URL}/demo/eicar`,
      note: "Unauthenticated EICAR demo (callable from internet)",
    });
    attackSurfacePublic.push({
      path: `${ORDER_WEBHOOK_URL}/demo/yaml`,
      note: "Unauthenticated PyYAML exploit demo",
    });
  }

  return {
    exploit_lab_enabled: true,
    azure_runtime: azure,
    function_enabled: orderWebhookConfigured && (orderWebhook?.azure_runtime ?? azure),
    is_local: local,
    eicar_present: orderWebhook?.eicar_present === true,
    cspm_misconfigurations: [
      {
        id: "public-blob",
        finding: "Public blob container with synthetic customer export + leaked SP credentials",
        severity: "Critical",
        active: azure,
        trigger: "Terraform (always deployed)",
      },
      {
        id: "mi-overprivileged",
        finding: "Workload managed identity: Contributor on subscription",
        severity: "Critical",
        active: azure,
        trigger: "Terraform (always deployed)",
      },
      {
        id: "ssh-nsg",
        finding: "SSH (22) open to 0.0.0.0/0 on workload NSG",
        severity: "High",
        active: azure,
        trigger: "Terraform (always deployed)",
      },
      {
        id: "public-function",
        finding: "Public Function App URL with no auth and CORS *",
        severity: "Critical",
        active: orderWebhookConfigured && azure,
        trigger: "Terraform (always deployed)",
      },
      {
        id: "dev-sp-uaa",
        finding: "Dev service principal: User Access Administrator on subscription",
        severity: "Critical",
        active: azure,
        trigger: "Terraform (always deployed)",
      },
      {
        id: "leaked-sp-secret",
        finding: "Long-lived app registration client secret in public blob + container mount",
        severity: "Critical",
        active: azure && demo.identity_attack_paths?.sp_credential_theft === true,
        trigger: "Terraform (always deployed)",
      },
      {
        id: "chat-rag-exposed",
        finding: "chat-rag published on host port 8001",
        severity: "Medium",
        active: local,
        trigger: "docker-compose port mapping",
      },
    ],
    active_cves: cves,
    identity_misconfigurations: [
      {
        role: "workload-managed-identity",
        finding: "Contributor on subscription + Key Vault Secrets User",
        details: "IMDS token → ARM / Key Vault / Storage abuse",
        severity: "Critical",
        active: azure,
        trigger: "Terraform (always deployed)",
      },
      {
        role: "dev-service-principal",
        finding: "User Access Administrator + leaked client secret",
        details: "Microsoft.Authorization/roleAssignments/write privilege escalation",
        severity: "Critical",
        active: azure,
        trigger: "Terraform (always deployed)",
      },
    ],
    attack_surface_public: attackSurfacePublic,
  };
}

export async function GET() {
  let demo: DemoStatus = {};
  try {
    const res = await proxyChat("/demo/exploit/status");
    if (res.ok) demo = await res.json();
  } catch {
    /* chat-rag unreachable */
  }

  let orderWebhook: OrderWebhookStatus | null = null;
  const orderWebhookConfigured = Boolean(ORDER_WEBHOOK_URL);
  if (orderWebhookConfigured) {
    try {
      const res = await proxyOrderWebhook("/status");
      if (res.ok) orderWebhook = await res.json();
    } catch {
      /* function unreachable */
    }
  }

  const findings = buildFindings(BASE.environment, demo, orderWebhook, orderWebhookConfigured);

  console.log(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      event_type: "security_posture_check",
      service: "frontend",
      environment: BASE.environment,
      exploit_lab: true,
      function_enabled: findings.function_enabled,
    })
  );

  return NextResponse.json({
    ...BASE,
    attack_surface: {
      ...BASE.attack_surface,
      public: findings.attack_surface_public,
    },
    findings: {
      exploit_lab_enabled: findings.exploit_lab_enabled,
      azure_runtime: findings.azure_runtime,
      function_enabled: findings.function_enabled,
      is_local: findings.is_local,
      eicar_present: findings.eicar_present,
      cspm_misconfigurations: findings.cspm_misconfigurations,
      active_cves: findings.active_cves,
      identity_misconfigurations: findings.identity_misconfigurations,
    },
  });
}

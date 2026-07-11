export type PocCategory = "cloud-xdr" | "container-runtime" | "ai";

export interface PocStory {
  id: string;
  category: PocCategory;
  title: string;
  blurb: string;
  upwindFocus: string;
  pocIds: string[];
  continueIn?: { tab: PocCategory; storyId: string; label: string };
}

export interface SecurityPoc {
  id: string;
  category: PocCategory;
  cve: string;
  title: string;
  method: "POST" | "GET";
  apiPath: string;
  description: string;
  outcome: string;
  upwindPolicies: string[];
  requiresPillow?: boolean;
  azureOnly?: boolean;
  functionOnly?: boolean;
}

export const POC_CATEGORIES: Array<{
  id: PocCategory;
  label: string;
  blurb: string;
}> = [
  {
    id: "cloud-xdr",
    label: "Cloud XDR",
    blurb:
      "Continue after container compromise — workload identity and long-lived SP paths to Key Vault and Blob exfiltration.",
  },
  {
    id: "container-runtime",
    label: "Container Runtime",
    blurb:
      "Ordered stories from CVE initial access through post-exploit toolkit — run steps in sequence for correlated Upwind Events.",
  },
  {
    id: "ai",
    label: "AI",
    blurb: "Unauthenticated AI admin actions and prompt abuse — AI SPM audit trail.",
  },
];

export const SECURITY_POCS: SecurityPoc[] = [
  // Cloud XDR — identity-first attack paths
  {
    id: "managed-identity-token",
    category: "cloud-xdr",
    cve: "T1552.005",
    title: "Managed identity token theft",
    method: "POST",
    apiPath: "/api/security/demo/runtime/managed-identity-token",
    azureOnly: true,
    upwindPolicies: ["Azure credentials access", "Metadata server access", "Lookup IP Services DNS"],
    description:
      "After compromise, curls Azure IMDS (169.254.169.254) or the platform identity endpoint for an OAuth token — the Azure equivalent of AWS/GCP metadata abuse.",
    outcome:
      "Redacted access_token + IMDS curl + IP lookup DNS/curl probes for network built-ins.",
  },
  {
    id: "managed-identity-abuse",
    category: "cloud-xdr",
    cve: "T1078",
    title: "Post-compromise data access",
    method: "POST",
    apiPath: "/api/security/demo/iam-abuse",
    azureOnly: true,
    upwindPolicies: ["Activity Log Key Vault", "Activity Log Storage", "ARM operations"],
    description:
      "After token theft, abuses overprivileged workload managed identity — Key Vault, Blob Storage, and ARM enumeration.",
    outcome: "Azure Activity Log entries for data-plane enumeration from the workload identity.",
  },
  {
    id: "sp-credential-theft",
    category: "cloud-xdr",
    cve: "T1552",
    title: "Service principal credential theft",
    method: "POST",
    apiPath: "/api/security/demo/runtime/sp-credential-theft",
    azureOnly: true,
    upwindPolicies: ["Azure credentials access", "Dormant secret usage"],
    description:
      "Uses a long-lived app registration client secret leaked in the container / CI artifact (classic misconfiguration).",
    outcome:
      "Authenticates as dev SP via az login --service-principal — persistent until secret rotated.",
  },
  {
    id: "role-assignment-abuse",
    category: "cloud-xdr",
    cve: "T1098",
    title: "Role assignment abuse (UAA)",
    method: "POST",
    apiPath: "/api/security/demo/runtime/role-assignment-abuse",
    azureOnly: true,
    upwindPolicies: ["Activity Log identity", "Privilege escalation"],
    description:
      "Compromised identity with User Access Administrator uses Microsoft.Authorization/roleAssignments/write to escalate.",
    outcome:
      "Lists role assignments and demonstrates write — Owner / Contributor takeover path.",
  },
  {
    id: "keyvault-secrets",
    category: "cloud-xdr",
    cve: "T1552",
    title: "Key Vault secrets theft",
    method: "POST",
    apiPath: "/api/security/demo/runtime/keyvault-secrets",
    azureOnly: true,
    upwindPolicies: ["Activity Log Key Vault", "Azure credentials access"],
    description:
      "Key Vault Secrets User / Officer retrieves DB passwords, API keys, and storage keys.",
    outcome: "Redacted secret previews — immediate pivot into databases and storage.",
  },
  {
    id: "mi-keyvault-chain",
    category: "cloud-xdr",
    cve: "T1078",
    title: "MI → Key Vault → Storage chain",
    method: "POST",
    apiPath: "/api/security/demo/runtime/mi-keyvault-chain",
    azureOnly: true,
    upwindPolicies: ["Identity graph / attack path", "Key Vault + Storage correlation"],
    description:
      "Managed identity token → Key Vault storage key → Blob Storage — lateral movement without CVEs.",
    outcome: "Three-step kill chain combining two common Azure misconfigurations.",
  },
  {
    id: "blob-exfil",
    category: "cloud-xdr",
    cve: "CWE-200",
    title: "Blob Storage data exfiltration",
    method: "POST",
    apiPath: "/api/security/demo/runtime/blob-exfil",
    azureOnly: true,
    upwindPolicies: ["Activity Log Storage", "Managed identity abuse chain"],
    description:
      "Enumerates Blob containers and probes objects using stolen managed identity credentials.",
    outcome: "Lists workshop containers and samples the public demo export.",
  },
  // Container Runtime
  {
    id: "metadata-creds",
    category: "container-runtime",
    cve: "T1552.005",
    title: "IMDS token theft (runtime)",
    method: "POST",
    apiPath: "/api/security/demo/runtime/metadata-creds",
    azureOnly: true,
    upwindPolicies: ["Azure credentials access", "Metadata server access", "Lookup IP Services DNS"],
    description:
      "Same as Cloud XDR token theft — run after Pillow RCE to show container → IMDS → token chain.",
    outcome:
      "Redacted token from 169.254.169.254 plus IP lookup DNS/curl — bridge to Cloud XDR tab.",
  },
  {
    id: "pillow-rce",
    category: "container-runtime",
    cve: "CVE-2023-50447",
    title: "Pillow RCE",
    method: "POST",
    apiPath: "/api/security/demo/pillow",
    requiresPillow: true,
    upwindPolicies: [
      "Operating system utilities processes",
      "Shell Process Redirect",
      "Out Of Baseline",
    ],
    description: "Exploits Pillow 10.0.1 ImageMath.eval for container-local code execution.",
    outcome: "Runs `id` via code execution — initial access for the identity kill chain.",
  },
  {
    id: "shell-pipe",
    category: "container-runtime",
    cve: "CWE-78",
    title: "Shell pipe redirect",
    method: "POST",
    apiPath: "/api/security/demo/runtime/shell-pipe",
    upwindPolicies: [
      "Interactive shell process stream redirected to a pipe",
      "Shell Process Redirect",
      "Operating system utilities processes",
    ],
    description: "Runs real `id` + `tee` binaries, then `sh -i` with stdio on pipes.",
    outcome: "Discrete Process events on ACA/ECS tracers plus syscall pattern for sh -i.",
  },
  {
    id: "cryptominer-sim",
    category: "container-runtime",
    cve: "CWE-400",
    title: "Crypto miner simulation",
    method: "POST",
    apiPath: "/api/security/demo/runtime/cryptominer-sim",
    upwindPolicies: ["Crypto mining threats", "CryptoMiners Services DNS"],
    description:
      "Harmless simulation: process renamed to `xmrig` + DNS lookups for known mining pools.",
    outcome: "cp/chmod/xmrig exec chain + pool DNS lookups — discrete Process events on tracers.",
  },
  {
    id: "curl-pipe-sh",
    category: "container-runtime",
    cve: "T1059 / T1105",
    title: "curl | sh supply chain",
    method: "POST",
    apiPath: "/api/security/demo/runtime/curl-pipe-sh",
    upwindPolicies: ["Operating system utilities processes", "Out Of Baseline"],
    description:
      "Runs `curl -fsSL file:///tmp/jss-supply-chain.sh | sh` against a harmless local script.",
    outcome: "Real `sh` + `curl` exec chain with pipe-shaped argv and `/tmp` marker output.",
  },
  {
    id: "renamed-downloader",
    category: "container-runtime",
    cve: "T1036 / T1105",
    title: "Renamed downloader",
    method: "POST",
    apiPath: "/api/security/demo/runtime/renamed-downloader",
    upwindPolicies: ["Operating system utilities processes", "Out Of Baseline"],
    description:
      "Copies `curl` to `/tmp/.wget`, chmods it, then executes the hidden-path downloader.",
    outcome: "cp/chmod/run chain from `/tmp/.wget` — tracer-friendly process drift signal.",
  },
  {
    id: "package-manager",
    category: "container-runtime",
    cve: "CWE-494",
    title: "Package manager in container",
    method: "POST",
    apiPath: "/api/security/demo/runtime/package-manager",
    upwindPolicies: ["Package Managers Processes", "Drift"],
    description: "Runs `pip install pytz` inside the running chat-rag container.",
    outcome: "Package manager install process — Package Managers Processes built-in on tracers.",
  },
  {
    id: "sensitive-file-cat",
    category: "container-runtime",
    cve: "T1005",
    title: "Sensitive file via cat",
    method: "POST",
    apiPath: "/api/security/demo/runtime/sensitive-file-cat",
    upwindPolicies: [
      "Sensitive file access",
      "Sensitive System File Access",
      "System Information File Access",
      "Operating system utilities processes",
    ],
    description:
      "Runs discrete `cat` processes against `/etc/passwd`, `/etc/hosts`, and `/proc/*` files.",
    outcome: "Explicit Process/File events for sensitive file reads without relying on Python IO.",
  },
  {
    id: "path-traversal",
    category: "container-runtime",
    cve: "CVE-2021-41773",
    title: "Path traversal",
    method: "GET",
    apiPath: "/api/security/demo/traversal",
    upwindPolicies: [
      "Sensitive file access",
      "Sensitive System File Access",
      "System Information File Access",
      "Operating system utilities processes",
    ],
    description:
      "Legacy download reads `../confidential/api-credentials.txt`, then cats `/etc/passwd` and `/proc/cpuinfo`.",
    outcome: "Traversal plus discrete cat on system paths for file/process built-ins.",
  },
  {
    id: "order-yaml-checkout",
    category: "container-runtime",
    cve: "CVE-2020-14343",
    title: "Poisoned checkout fulfillment",
    method: "POST",
    apiPath: "/api/security/demo/order-yaml-checkout",
    functionOnly: true,
    upwindPolicies: [
      "CVE-2020-14343 / unsafe deserialization",
      "Shell Process Redirect",
      "Azure credentials access",
      "Activity Log storage",
    ],
    description:
      "Places a real order via POST /api/checkout with a malicious fulfillmentManifest — yaml.load RCE in Azure Function, then id/shell, managed identity token theft, and ARM storage enumeration.",
    outcome:
      "Full kill chain in checkout response on order-webhook Function App; tracer Process events plus Activity Log.",
  },
  // AI
  {
    id: "ai-chat-unauth",
    category: "ai",
    cve: "CWE-306",
    title: "Unauthenticated AI chat",
    method: "POST",
    apiPath: "/api/security/demo/ai-chat",
    upwindPolicies: ["Communication to External AI Service", "AI SPM"],
    description:
      "Sends a prompt-injection style request through unauthenticated /api/chat → OpenAI.",
    outcome: "AI inference audit logs — AI SPM without user identity.",
  },
  {
    id: "unauth-reindex",
    category: "ai",
    cve: "CWE-306",
    title: "Unauth RAG reindex",
    method: "POST",
    apiPath: "/api/security/demo/reindex",
    upwindPolicies: ["AI admin action", "Unauthorized API"],
    description: "Wipes and rebuilds the RAG knowledge base with no authentication.",
    outcome: "Unauthorized admin on AI data plane — rebuilds embeddings via OpenAI.",
  },
];

export const POC_STORIES: PocStory[] = [
  {
    id: "container-compromise",
    category: "container-runtime",
    title: "Story 1 — CVE to cloud pivot",
    blurb:
      "Exploit Pillow RCE, harvest secrets on disk, probe host paths, then steal the workload managed identity token.",
    upwindFocus: "Process events → sensitive file reads → Azure credentials / metadata access",
    pocIds: ["pillow-rce", "path-traversal", "sensitive-file-cat", "metadata-creds"],
    continueIn: {
      tab: "cloud-xdr",
      storyId: "identity-to-data",
      label: "Continue in Cloud XDR → Story 1 (Workload identity to data theft)",
    },
  },
  {
    id: "post-exploit-toolkit",
    category: "container-runtime",
    title: "Story 2 — Attacker toolkit & impact",
    blurb:
      "Stage a supply-chain download, evade with a renamed binary, run crypto miner impact, then install tools for persistence.",
    upwindFocus: "Crypto mining threats (reliable Detection) + package manager / drift Events",
    pocIds: ["curl-pipe-sh", "renamed-downloader", "cryptominer-sim", "package-manager"],
  },
  {
    id: "serverless-checkout-chain",
    category: "container-runtime",
    title: "Story 3 — Poisoned checkout (order webhook)",
    blurb:
      "Real cart checkout path on order-webhook Function App: poisoned fulfillmentManifest triggers PyYAML RCE, post-exploit subprocess toolkit, managed identity token theft, and storage abuse.",
    upwindFocus:
      "Tracer Process events on Function App · Azure credentials access · Activity Log storage",
    pocIds: ["order-yaml-checkout"],
  },
  {
    id: "syscall-deep-dive",
    category: "container-runtime",
    title: "Story 4 — Shell mechanics (sensor environments)",
    blurb:
      "Optional syscall deep-dive on ACA chat-rag — strongest on GKE eBPF sensor; ACA tracers usually show Process Events only.",
    upwindFocus: "Shell Process Redirect · Story correlation on sensor, Events-only on ACA tracer",
    pocIds: ["shell-pipe"],
  },
  {
    id: "identity-to-data",
    category: "cloud-xdr",
    title: "Story 1 — Workload identity to data theft",
    blurb:
      "After container compromise, steal MI token then abuse Key Vault and Blob Storage — Activity Log correlation.",
    upwindFocus: "Activity Log Key Vault · Storage · identity graph attack path",
    pocIds: [
      "managed-identity-token",
      "managed-identity-abuse",
      "keyvault-secrets",
      "mi-keyvault-chain",
      "blob-exfil",
    ],
  },
  {
    id: "persistent-identity",
    category: "cloud-xdr",
    title: "Story 2 — Long-lived identity abuse",
    blurb:
      "Alternate kill chain: leaked service principal secret → UAA role assignment → secrets and blob exfiltration.",
    upwindFocus: "Dormant secret usage · privilege escalation · Activity Log identity",
    pocIds: ["sp-credential-theft", "role-assignment-abuse", "keyvault-secrets", "blob-exfil"],
  },
  {
    id: "ai-data-plane",
    category: "ai",
    title: "Story 1 — Unauthenticated AI abuse",
    blurb: "Prompt abuse through the open chat endpoint, then wipe and rebuild RAG without authentication.",
    upwindFocus: "Communication to External AI Service · AI SPM · unauthorized admin",
    pocIds: ["ai-chat-unauth", "unauth-reindex"],
  },
];

export function getStoriesForCategory(category: PocCategory): PocStory[] {
  return POC_STORIES.filter((story) => story.category === category);
}

export function isPocBlocked(
  poc: SecurityPoc,
  findings: {
    active_cves: Array<{ cve: string }>;
    azure_runtime: boolean;
    function_enabled: boolean;
  }
): boolean {
  if (poc.requiresPillow && findings.active_cves.every((c) => !c.cve.includes("50447"))) {
    return true;
  }
  if (poc.azureOnly && !findings.azure_runtime) return true;
  if (poc.functionOnly && !findings.function_enabled) return true;
  return false;
}

export type PocCategory = "container" | "serverless" | "cloud-xdr" | "ai";

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
    id: "container",
    label: "Container",
    blurb:
      "Frontend + chat-rag on ACA — React2Shell / Pillow initial access, then tracer-friendly toolkit and IMDS pivot.",
  },
  {
    id: "serverless",
    label: "Serverless",
    blurb:
      "order-webhook Function App — poisoned checkout PyYAML MITRE chain with tracer Process/File/API signals.",
  },
  {
    id: "cloud-xdr",
    label: "Cloud XDR",
    blurb:
      "Continue after container compromise — workload identity and long-lived SP paths to Key Vault and Blob exfiltration.",
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
    category: "container",
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
    id: "react2shell",
    category: "container",
    cve: "CVE-2025-55182",
    title: "React2Shell → process toolkit",
    method: "POST",
    apiPath: "/api/security/demo/react2shell",
    upwindPolicies: [
      "Operating system utilities processes",
      "Shell Process Redirect",
      "Crypto mining threats",
      "Sensitive file access",
    ],
    description:
      "React2Shell (CVE-2025-55182 / CVE-2025-66478) on Next.js App Router — workshop harness runs the post-RCE toolkit inside the frontend Node process (id, shell pipe, renamed downloader, sensitive cat, miner).",
    outcome:
      "Process events from the frontend container. SCA shows Critical on next@15.1.0 / react@19.0.0. Continue with metadata → Cloud XDR.",
  },
  {
    id: "pillow-rce",
    category: "container",
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
    category: "container",
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
    category: "container",
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
    category: "container",
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
    category: "container",
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
    category: "container",
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
    category: "container",
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
    category: "container",
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
    category: "serverless",
    cve: "CVE-2020-14343",
    title: "Serverless tracer kill chain (checkout)",
    method: "POST",
    apiPath: "/api/security/demo/order-yaml-checkout",
    functionOnly: true,
    upwindPolicies: [
      "API custom rules — poisoned checkout",
      "CVE-2020-14343 / unsafe deserialization",
      "Shell Process Redirect",
      "Azure credentials access",
      "Crypto mining threats",
      "Malware protection",
      "Activity Log storage",
    ],
    description:
      "One poisoned POST /checkout on Function App runs the full MITRE tracer chain: T1190 → T1203 PyYAML → T1059 shell/id → T1027 renamed curl → T1005 sensitive cat → T1552 IMDS MI token → T1619 ARM storage → T1496 miner → T1565 EICAR.",
    outcome:
      "10-step securityDemo.chain with mitre_attack map. Tracer Process/File/API on Function App; Activity Log for storage APIs.",
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
    id: "react2shell-pivot",
    category: "container",
    title: "Story 1 — React2Shell to cloud pivot",
    blurb:
      "Unauthenticated RSC RCE on the frontend container, post-exploit toolkit in the Next.js process, then metadata for cloud identity.",
    upwindFocus: "Frontend Process events → credentials / metadata access → continue Cloud XDR",
    pocIds: ["react2shell", "metadata-creds"],
    continueIn: {
      tab: "cloud-xdr",
      storyId: "identity-to-data",
      label: "Continue in Cloud XDR → Story 1 (Workload identity to data theft)",
    },
  },
  {
    id: "container-compromise",
    category: "container",
    title: "Story 2 — Pillow CVE to host recon",
    blurb:
      "Alternate initial access on chat-rag: Pillow RCE, path traversal, sensitive cat, then metadata.",
    upwindFocus: "chat-rag Process events → sensitive file reads → credentials / metadata",
    pocIds: ["pillow-rce", "path-traversal", "sensitive-file-cat", "metadata-creds"],
    continueIn: {
      tab: "cloud-xdr",
      storyId: "identity-to-data",
      label: "Continue in Cloud XDR → Story 1",
    },
  },
  {
    id: "post-exploit-toolkit",
    category: "container",
    title: "Story 3 — Attacker toolkit & impact",
    blurb:
      "Supply-chain download shape, renamed binary evasion, crypto miner Detection, package manager drift.",
    upwindFocus: "Crypto mining threats (reliable Detection) + package manager / drift Events",
    pocIds: ["curl-pipe-sh", "renamed-downloader", "cryptominer-sim", "package-manager"],
  },
  {
    id: "syscall-deep-dive",
    category: "container",
    title: "Story 4 — Shell mechanics (optional)",
    blurb:
      "Optional syscall deep-dive on ACA chat-rag — ACA tracers usually show Process Events only.",
    upwindFocus: "Shell Process Redirect · use Story 3 cryptominer for Detections",
    pocIds: ["shell-pipe"],
  },
  {
    id: "serverless-checkout-chain",
    category: "serverless",
    title: "Story 1 — MITRE kill chain (Function App checkout)",
    blurb:
      "Parallel RCE lane on serverless: public Function checkout → PyYAML → toolkit → MI token → ARM storage → miner + EICAR.",
    upwindFocus:
      "Tracer Process + File + API on Function App · Activity Log · same MITRE shape as Container Story 1",
    pocIds: ["order-yaml-checkout"],
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
  }
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

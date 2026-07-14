export type PocCategory = "container" | "serverless" | "cloud-xdr" | "ai";

export interface PocStory {
  id: string;
  category: PocCategory;
  /** Workshop Story slot (1 or 2) — maps to a distinct Upwind Threat Story flow. */
  storyIndex: 1 | 2;
  /** Upwind resource this Story should land on (must differ across Stories). */
  targetResource: string;
  title: string;
  blurb: string;
  /** Plain-language explanation of what the chain does under the hood. */
  underTheHood: string;
  upwindFocus: string;
  /** Minutes to wait between Story event steps for scoring. */
  stepGapSeconds?: number;
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
    label: "Story 1 · chat-rag",
    blurb:
      "Upwind Threat Story on ACA chat-rag (tracer — Stories harder; crypto Detection reliable). CVE-named processes + crypto + pip — the Jul-7 Story shape.",
  },
  {
    id: "serverless",
    label: "Story 2 · frontend",
    blurb:
      "Second Story on a different resource (frontend). React2Shell toolkit in the Next.js process — must not reuse chat-rag or Upwind merges flows.",
  },
  {
    id: "cloud-xdr",
    label: "Extras · Cloud XDR",
    blurb:
      "Identity / data-plane PoCs after a Story. Useful for Timeline follow-on, not a third Story on the same host.",
  },
  {
    id: "ai",
    label: "Extras · AI",
    blurb: "AI SPM demos — package CVEs and unauth AI admin (usually Events / SCA, not Stories).",
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
    title: "CVE-named id redirect (Pillow RCE)",
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
    title: "Shell pipe / tee redirect",
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
    id: "cve-probe-story",
    category: "container",
    cve: "CVE-2023-50447",
    title: "Threat Story recipe — CVE Exploitation Probing",
    method: "POST",
    apiPath: "/api/security/demo/runtime/cve-probe-story",
    requiresPillow: false,
    upwindPolicies: [
      "Suspicious CVE Exploitation Probing",
      "Crypto mining threats",
      "Shell Process Redirect",
      "Package Managers Processes",
      "Drift",
    ],
    description:
      "One-click Jul-7 Upwind Threat Story cluster on chat-rag: Pillow CVE id file, shell pipe/tee, exec -a xmrig + mining DNS, pip list. Matches Suspicious CVE Exploitation Probing.",
    outcome:
      "Upwind Threat Story on GKE (sensor). On ECS/ACA expect crypto Detection + Process Events.",
  },
  {
    id: "cryptominer-sim",
    category: "container",
    cve: "CWE-400",
    title: "Cryptocurrency mining process",
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
    title: "Suspicious file download (curl | sh)",
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
    title: "Renamed downloader (process masquerade)",
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
    title: "Package manager enumeration",
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
    title: "Private key or password search",
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
    title: "Sensitive file access (path traversal)",
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
  {
    id: "langchain-ai",
    category: "ai",
    cve: "CVE-2024-5998",
    title: "LangChain / Chroma AI supply chain",
    method: "POST",
    apiPath: "/api/security/demo/runtime/langchain-ai",
    upwindPolicies: [
      "AI SPM / vulnerable AI packages",
      "Operating system utilities processes",
      "Shell Process Redirect",
      "Package Managers Processes",
      "Crypto mining threats",
    ],
    description:
      "Pinned langchain-community (CVE-2024-5998 FAISS pickle) + chromadb 0.5.x (CVE-2026-45831). Workshop harness runs post-deserialize toolkit in chat-rag — no pickle gadget shipped.",
    outcome:
      "SCA Criticals on chat-rag plus Process events (id redirect, tee, pip list, xmrig) from the AI workload.",
  },
];

export const POC_STORIES: PocStory[] = [
  {
    id: "story-1-cve-probing",
    category: "container",
    storyIndex: 1,
    targetResource: "chat-rag",
    title: "Story 1 — Suspicious CVE Exploitation Probing",
    blurb:
      "Generate Threat Story #1 on chat-rag. Run events in order with ~30s gaps. ACA tracer: expect crypto Detection; Story score harder than GKE.",
    underTheHood:
      "Docs: a Story opens when related high-severity detections cross a score threshold on one flow. These four steps match the Jul-7 Story: Pillow CVE id file → shell pipe/tee → exec -a xmrig (+ pool DNS) → pip list. Toxic combo = vulnerable Pillow package + out-of-baseline process Drift. Close any Open Story of this shape first if Last seen is frozen.",
    upwindFocus:
      "Threats → Stories · resource chat-rag · Azure. Expect crypto Detection immediately; Story may lag several minutes.",
    stepGapSeconds: 30,
    pocIds: ["pillow-rce", "shell-pipe", "cryptominer-sim", "package-manager"],
  },
  {
    id: "story-2-frontend-rce",
    category: "serverless",
    storyIndex: 2,
    targetResource: "frontend",
    title: "Story 2 — Unauthenticated RCE on frontend",
    blurb:
      "Generate Threat Story #2 on a DIFFERENT resource (frontend), so Upwind cannot fold it into Story 1.",
    underTheHood:
      "React2Shell harness runs the post-RCE toolkit inside the frontend Node process (id, shell, renamed binary, sensitive cat, miner-shaped process). Same cluster, different workload entity — required for a second Story per Docs (“same flow” consolidation).",
    upwindFocus:
      "Threats → Stories · resource frontend · Azure. Run after Story 1 has appeared (or after waiting). Do not run chat-rag PoCs in the same window.",
    stepGapSeconds: 0,
    pocIds: ["react2shell"],
  },
  {
    id: "identity-to-data",
    category: "cloud-xdr",
    storyIndex: 2,
    targetResource: "chat-rag + Azure APIs",
    title: "Follow-on — MI → Key Vault / Blob",
    blurb:
      "Optional Timeline follow-on AFTER Story 1. MI token → Key Vault/Blob — may enrich Story 1.",
    underTheHood:
      "IMDS MI token → Key Vault / Storage. Activity Log follow-on; different from Story 2 (frontend).",
    upwindFocus: "Activity Log · Key Vault · Blob · may attach to Story 1",
    stepGapSeconds: 45,
    pocIds: [
      "managed-identity-token",
      "managed-identity-abuse",
      "keyvault-secrets",
      "blob-exfil",
    ],
  },
  {
    id: "ai-data-plane",
    category: "ai",
    storyIndex: 2,
    targetResource: "chat-rag",
    title: "Extra — Unauthenticated AI abuse",
    blurb: "AI SPM / external AI egress demo — seldom becomes a Threat Story alone.",
    underTheHood: "Unauth /api/chat + reindex.",
    upwindFocus: "AI SPM · Events",
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

export type PocCategory = "container" | "serverless" | "cloud-xdr" | "ai";

export type StoryKind = "story" | "follow-on" | "extra";

export interface PocStory {
  id: string;
  category: PocCategory;
  kind: StoryKind;
  storyIndex?: 1 | 2;
  targetResource: string;
  title: string;
  blurb: string;
  underTheHood: string;
  lookFor: string;
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
  signals: string[];
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
    blurb: "Stories that run inside the chat-rag workload.",
  },
  {
    id: "serverless",
    label: "Frontend & serverless",
    blurb: "Stories on the storefront and order-webhook — separate hosts from container.",
  },
  {
    id: "cloud-xdr",
    label: "Identity",
    blurb: "Steal workload credentials and abuse cloud identity to reach data.",
  },
  {
    id: "ai",
    label: "AI",
    blurb: "Unauthenticated AI endpoints and vulnerable AI libraries.",
  },
];

export const SECURITY_POCS: SecurityPoc[] = [
  {
    id: "managed-identity-token",
    category: "cloud-xdr",
    cve: "T1552.005",
    title: "Steal a managed identity token",
    method: "POST",
    apiPath: "/api/security/demo/runtime/managed-identity-token",
    azureOnly: true,
    signals: ["Azure credentials access", "Metadata server access", "Lookup IP Services DNS"],
    description: "Queries Azure IMDS / platform identity for an OAuth token after compromise.",
    outcome: "Redacted access token from workload managed identity.",
  },
  {
    id: "managed-identity-abuse",
    category: "cloud-xdr",
    cve: "T1078",
    title: "Enumerate data with managed identity",
    method: "POST",
    apiPath: "/api/security/demo/iam-abuse",
    azureOnly: true,
    signals: ["Activity Log Key Vault", "Activity Log Storage", "ARM operations"],
    description: "Abuses an overprivileged managed identity against Key Vault, Blob, and ARM.",
    outcome: "Activity Log enumeration from the workload identity.",
  },
  {
    id: "sp-credential-theft",
    category: "cloud-xdr",
    cve: "T1552",
    title: "Use a leaked service principal secret",
    method: "POST",
    apiPath: "/api/security/demo/runtime/sp-credential-theft",
    azureOnly: true,
    signals: ["Azure credentials access", "Dormant secret usage"],
    description: "Authenticates with a long-lived app registration secret left in the workload.",
    outcome: "Service principal login — persistent until the secret is rotated.",
  },
  {
    id: "role-assignment-abuse",
    category: "cloud-xdr",
    cve: "T1098",
    title: "Abuse role assignment permissions",
    method: "POST",
    apiPath: "/api/security/demo/runtime/role-assignment-abuse",
    azureOnly: true,
    signals: ["Activity Log identity", "Privilege escalation"],
    description: "Uses User Access Administrator rights to inspect (and demonstrate) role assignment write.",
    outcome: "Privilege-escalation path via roleAssignments/write.",
  },
  {
    id: "keyvault-secrets",
    category: "cloud-xdr",
    cve: "T1552",
    title: "Read secrets from Key Vault",
    method: "POST",
    apiPath: "/api/security/demo/runtime/keyvault-secrets",
    azureOnly: true,
    signals: ["Activity Log Key Vault", "Azure credentials access"],
    description: "Retrieves Key Vault secrets (DB passwords, API keys, storage keys) with stolen identity.",
    outcome: "Redacted secret previews — pivot into databases and storage.",
  },
  {
    id: "mi-keyvault-chain",
    category: "cloud-xdr",
    cve: "T1078",
    title: "MI → Key Vault → Storage chain",
    method: "POST",
    apiPath: "/api/security/demo/runtime/mi-keyvault-chain",
    azureOnly: true,
    signals: ["Identity graph / attack path", "Key Vault + Storage correlation"],
    description: "Managed identity token → Key Vault storage key → Blob Storage.",
    outcome: "Multi-hop lateral movement without a CVE.",
  },
  {
    id: "blob-exfil",
    category: "cloud-xdr",
    cve: "CWE-200",
    title: "List and read Blob Storage",
    method: "POST",
    apiPath: "/api/security/demo/runtime/blob-exfil",
    azureOnly: true,
    signals: ["Activity Log Storage", "Managed identity abuse chain"],
    description: "Enumerates Blob containers and samples objects with stolen credentials.",
    outcome: "Blob list/get via managed identity — post-compromise data access.",
  },
  {
    id: "metadata-creds",
    category: "container",
    cve: "T1552.005",
    title: "Steal an IMDS token from the container",
    method: "POST",
    apiPath: "/api/security/demo/runtime/metadata-creds",
    azureOnly: true,
    signals: ["Azure credentials access", "Metadata server access", "Lookup IP Services DNS"],
    description: "Curls Azure IMDS for a managed identity token from inside the container.",
    outcome: "Redacted IMDS token — bridge from container RCE into identity abuse.",
  },
  {
    id: "react2shell",
    category: "container",
    cve: "CVE-2025-55182",
    title: "Exploit React2Shell on the frontend",
    method: "POST",
    apiPath: "/api/security/demo/react2shell",
    signals: [
      "Operating system utilities processes",
      "Shell Process Redirect",
      "Crypto mining threats",
      "Sensitive file access",
    ],
    description:
      "Uses React2Shell (CVE-2025-55182) against Next.js App Router to run post-RCE tooling in the frontend process.",
    outcome: "Process activity (shell, downloader, sensitive reads, miner sim) from the frontend container.",
  },
  {
    id: "pillow-rce",
    category: "container",
    cve: "CVE-2023-50447",
    title: "Gain code execution via Pillow",
    method: "POST",
    apiPath: "/api/security/demo/pillow",
    requiresPillow: true,
    signals: [
      "Operating system utilities processes",
      "Shell Process Redirect",
      "Out Of Baseline",
    ],
    description: "Exploits Pillow 10.0.1 ImageMath.eval for local code execution in chat-rag.",
    outcome: "Runs a short identity probe after RCE — discrete process activity in chat-rag.",
  },
  {
    id: "shell-pipe",
    category: "container",
    cve: "CWE-78",
    title: "Redirect a shell through a pipe",
    method: "POST",
    apiPath: "/api/security/demo/runtime/shell-pipe",
    signals: [
      "Interactive shell process stream redirected to a pipe",
      "Shell Process Redirect",
      "Operating system utilities processes",
    ],
    description: "Spawns real shell utilities with stdio wired through pipes (id, tee, interactive sh).",
    outcome: "Interactive shell / pipe-shaped process patterns.",
  },
  {
    id: "cve-probe-story",
    category: "container",
    cve: "CVE-2023-50447",
    title: "One-shot post-exploit probe",
    method: "POST",
    apiPath: "/api/security/demo/runtime/cve-probe-story",
    requiresPillow: false,
    signals: [
      "Suspicious CVE Exploitation Probing",
      "Crypto mining threats",
      "Shell Process Redirect",
      "Package Managers Processes",
      "Drift",
    ],
    description:
      "Compressed replay of several post-exploit techniques in one request (handy for a single detection window).",
    outcome: "Bundled process + network activity typical of CVE probing after foothold.",
  },
  {
    id: "cryptominer-sim",
    category: "container",
    cve: "CWE-400",
    title: "Simulate a crypto miner",
    method: "POST",
    apiPath: "/api/security/demo/runtime/cryptominer-sim",
    signals: ["Crypto mining threats", "CryptoMiners Services DNS"],
    description: "Harmless simulation: drop a renamed xmrig binary and resolve known mining-pool DNS names.",
    outcome: "Miner-shaped process chain plus mining-pool DNS lookups.",
  },
  {
    id: "curl-pipe-sh",
    category: "container",
    cve: "T1059 / T1105",
    title: "Download and pipe to shell",
    method: "POST",
    apiPath: "/api/security/demo/runtime/curl-pipe-sh",
    signals: ["Operating system utilities processes", "Out Of Baseline"],
    description: "Runs curl | sh against a harmless local script (supply-chain shaped).",
    outcome: "curl + sh pipe pattern with a /tmp marker.",
  },
  {
    id: "renamed-downloader",
    category: "container",
    cve: "T1036 / T1105",
    title: "Run a renamed downloader",
    method: "POST",
    apiPath: "/api/security/demo/runtime/renamed-downloader",
    signals: ["Operating system utilities processes", "Out Of Baseline"],
    description: "Copies curl to a hidden path, then executes it under a fake name.",
    outcome: "Renamed-binary / process-masquerade signal from /tmp.",
  },
  {
    id: "package-manager",
    category: "container",
    cve: "CWE-494",
    title: "Install a package with pip",
    method: "POST",
    apiPath: "/api/security/demo/runtime/package-manager",
    signals: ["Package Managers Processes", "Drift"],
    description: "Runs pip install inside the live chat-rag container.",
    outcome: "Package-manager process activity inside a running container.",
  },
  {
    id: "sensitive-file-cat",
    category: "container",
    cve: "T1005",
    title: "Read sensitive host files",
    method: "POST",
    apiPath: "/api/security/demo/runtime/sensitive-file-cat",
    signals: [
      "Sensitive file access",
      "Sensitive System File Access",
      "System Information File Access",
      "Operating system utilities processes",
    ],
    description: "Cats /etc/passwd, /etc/hosts, and selected /proc files via discrete processes.",
    outcome: "Sensitive file-read process/file events.",
  },
  {
    id: "path-traversal",
    category: "container",
    cve: "CVE-2021-41773",
    title: "Steal files via path traversal",
    method: "GET",
    apiPath: "/api/security/demo/traversal",
    signals: [
      "Sensitive file access",
      "Sensitive System File Access",
      "System Information File Access",
      "Operating system utilities processes",
    ],
    description: "Legacy download path reads a confidential file, then probes system paths.",
    outcome: "Path traversal plus sensitive file access on chat-rag.",
  },
  {
    id: "order-yaml-checkout",
    category: "serverless",
    cve: "CVE-2020-14343",
    title: "Poison checkout with unsafe YAML",
    method: "POST",
    apiPath: "/api/security/demo/order-yaml-checkout",
    functionOnly: true,
    signals: [
      "API custom rules — poisoned checkout",
      "CVE-2020-14343 / unsafe deserialization",
      "Shell Process Redirect",
      "Azure credentials access",
      "Crypto mining threats",
      "Malware protection",
      "Activity Log storage",
    ],
    description:
      "Sends a poisoned POST /checkout to the Function App — unsafe YAML deserialize into a post-exploit sequence.",
    outcome: "Full serverless kill chain on the order webhook (process, identity, storage, miner sim).",
  },
  {
    id: "ai-chat-unauth",
    category: "ai",
    cve: "CWE-306",
    title: "Call chat with no authentication",
    method: "POST",
    apiPath: "/api/security/demo/ai-chat",
    signals: ["Communication to External AI Service", "AI SPM"],
    description: "Posts a prompt-injection style request through unauthenticated /api/chat → OpenAI.",
    outcome: "Unauthenticated egress to an external AI API.",
  },
  {
    id: "unauth-reindex",
    category: "ai",
    cve: "CWE-306",
    title: "Rebuild the RAG index without auth",
    method: "POST",
    apiPath: "/api/security/demo/reindex",
    signals: ["AI admin action", "Unauthorized API"],
    description: "Wipes and rebuilds the RAG knowledge base with no authentication.",
    outcome: "Unauthorized admin action on the AI data plane.",
  },
  {
    id: "langchain-ai",
    category: "ai",
    cve: "CVE-2024-5998",
    title: "Exercise vulnerable AI packages",
    method: "POST",
    apiPath: "/api/security/demo/runtime/langchain-ai",
    signals: [
      "AI SPM / vulnerable AI packages",
      "Operating system utilities processes",
      "Shell Process Redirect",
      "Package Managers Processes",
      "Crypto mining threats",
    ],
    description:
      "Touches pinned langchain-community / chromadb CVEs and runs light post-compromise tooling on chat-rag.",
    outcome: "SCA package signals plus process activity from the AI workload.",
  },
];

export const POC_STORIES: PocStory[] = [
  {
    id: "story-1-cve-probing",
    category: "container",
    kind: "story",
    storyIndex: 1,
    targetResource: "chat-rag",
    title: "Post-exploit toolkit on chat-rag",
    blurb:
      "After a path-traversal / RCE foothold, runs shell, downloaders, secret reads, a miner sim, and package probing on the chat service.",
    underTheHood:
      "Traversal → Pillow RCE → shell pipe → curl|sh → renamed downloader → sensitive cat → xmrig sim → pip → optional one-shot probe.",
    lookFor: "Process, shell redirects, renamed binaries, sensitive files, mining DNS, and pip on chat-rag",
    stepGapSeconds: 8,
    pocIds: [
      "path-traversal",
      "pillow-rce",
      "shell-pipe",
      "curl-pipe-sh",
      "renamed-downloader",
      "sensitive-file-cat",
      "cryptominer-sim",
      "package-manager",
      "cve-probe-story",
    ],
    continueIn: {
      tab: "cloud-xdr",
      storyId: "identity-to-data",
      label: "Continue with identity → Key Vault / Blob",
    },
  },
  {
    id: "story-2-frontend-rce",
    category: "serverless",
    kind: "story",
    storyIndex: 2,
    targetResource: "frontend + order-webhook",
    title: "Frontend RCE → serverless checkout",
    blurb:
      "Exploits React2Shell on the storefront, then sends a poisoned order to the Function App checkout webhook.",
    underTheHood:
      "Frontend Node post-RCE toolkit, then PyYAML deserialization kill chain on the order webhook.",
    lookFor: "Process on frontend · unsafe YAML on Function App · follow-on crypto / identity noise",
    stepGapSeconds: 8,
    pocIds: ["react2shell", "order-yaml-checkout"],
  },
  {
    id: "identity-to-data",
    category: "cloud-xdr",
    kind: "follow-on",
    targetResource: "chat-rag + Azure APIs",
    title: "Steal MI / SP → Key Vault & Blob",
    blurb:
      "Pulls IMDS tokens and service principal secrets, escalates roles, then reads Key Vault and Blob Storage.",
    underTheHood:
      "IMDS + MI token, SP theft, role assignment, Key Vault secrets, MI→KV→Storage, Blob enumeration.",
    lookFor: "Activity Log · Key Vault · Blob · managed identity · service principal",
    stepGapSeconds: 8,
    pocIds: [
      "metadata-creds",
      "managed-identity-token",
      "managed-identity-abuse",
      "sp-credential-theft",
      "role-assignment-abuse",
      "keyvault-secrets",
      "mi-keyvault-chain",
      "blob-exfil",
    ],
  },
  {
    id: "ai-data-plane",
    category: "ai",
    kind: "extra",
    targetResource: "chat-rag",
    title: "Unauthenticated AI abuse",
    blurb:
      "Hits open chat and reindex endpoints, then exercises vulnerable AI packages on chat-rag.",
    underTheHood: "Unauth /api/chat and /reindex, then langchain-community / chromadb toolkit.",
    lookFor: "External AI egress · unauthenticated admin API · AI package CVEs",
    stepGapSeconds: 8,
    pocIds: ["ai-chat-unauth", "unauth-reindex", "langchain-ai"],
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

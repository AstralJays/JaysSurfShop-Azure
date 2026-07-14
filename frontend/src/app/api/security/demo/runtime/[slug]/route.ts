import { NextResponse } from "next/server";
import { proxyChat } from "@/lib/demoLab";

const PROXY_ROUTES: Record<string, string> = {
  pillow: "/demo/exploit/pillow",
  "cve-probe-story": "/demo/exploit/cve-probe-story",
  "iam-abuse": "/demo/exploit/managed-identity-abuse",
  "managed-identity-token": "/demo/exploit/managed-identity-token",
  "managed-identity-abuse": "/demo/exploit/managed-identity-abuse",
  "metadata-creds": "/demo/exploit/managed-identity-token",
  "sp-credential-theft": "/demo/exploit/sp-credential-theft",
  "role-assignment-abuse": "/demo/exploit/role-assignment-abuse",
  "keyvault-secrets": "/demo/exploit/keyvault-secrets",
  "mi-keyvault-chain": "/demo/exploit/mi-keyvault-chain",
  "blob-exfil": "/demo/exploit/blob-exfil",
  "shell-pipe": "/demo/exploit/shell-pipe",
  "cryptominer-sim": "/demo/exploit/cryptominer-sim",
  "curl-pipe-sh": "/demo/exploit/curl-pipe-sh",
  "renamed-downloader": "/demo/exploit/renamed-downloader",
  "package-manager": "/demo/exploit/package-manager",
  "sensitive-file-cat": "/demo/exploit/sensitive-file-cat",
  "eicar-file": "/demo/exploit/eicar-file",
  "langchain-ai": "/demo/exploit/langchain-ai",
  "ai-prompt-injection": "/demo/exploit/ai-prompt-injection",
  "ai-sensitive-disclosure": "/demo/exploit/ai-sensitive-disclosure",
  "ai-poison": "/demo/exploit/ai-poison",
  "ai-xss-output": "/demo/exploit/ai-xss-output",
  "ai-system-prompt-leak": "/demo/exploit/ai-system-prompt-leak",
  "ai-rag-embedding": "/demo/exploit/ai-rag-embedding",
  "ai-unbounded": "/demo/exploit/ai-unbounded",
};

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const path = PROXY_ROUTES[slug];
  if (!path) {
    return NextResponse.json({ detail: "Unknown PoC" }, { status: 404 });
  }

  try {
    const res = await proxyChat(path, { method: "POST" });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json(
      { detail: "chat-rag service unavailable" },
      { status: 503 }
    );
  }
}

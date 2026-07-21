import { NextResponse } from "next/server";
import { proxyChat } from "@/lib/chatProxy";

/** Admin knowledge rebuild — unauthenticated (broken function auth lab). */
export async function POST() {
  try {
    const res = await proxyChat("/admin/knowledge/rebuild", { method: "POST" });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ detail: "Rebuild service unavailable" }, { status: 503 });
  }
}

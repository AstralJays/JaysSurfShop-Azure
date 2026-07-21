import { NextResponse } from "next/server";
import { proxyChat } from "@/lib/chatProxy";

/** Admin user directory — includes demo passwords for workshop console. */
export async function GET() {
  try {
    const res = await proxyChat("/admin/users", { method: "GET" });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ detail: "Admin service unavailable" }, { status: 503 });
  }
}

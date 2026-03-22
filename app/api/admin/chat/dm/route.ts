export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/permissions";
import { findOrCreateDM } from "@/lib/google/chat";

export async function POST(req: NextRequest) {
  const authErr = await requirePermission(req, "chat", "edit");
  if (authErr) return authErr;

  try {
    const { email } = await req.json();
    if (!email) return NextResponse.json({ error: "email is required" }, { status: 400 });
    const space = await findOrCreateDM(email);
    return NextResponse.json(space);
  } catch (err) {
    console.error("CHAT_DM_ERROR:", err);
    const msg = err instanceof Error ? err.message : "Failed to open DM";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

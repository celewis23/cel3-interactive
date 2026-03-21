export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken, COOKIE_NAME } from "@/lib/admin/auth";
import { findOrCreateDM } from "@/lib/google/chat";

function requireAuth(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return false;
  return verifySessionToken(token)?.step === "full";
}

export async function POST(req: NextRequest) {
  if (!requireAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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

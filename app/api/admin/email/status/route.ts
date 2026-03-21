// GET: Returns connection status and unread count
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken, COOKIE_NAME } from "@/lib/admin/auth";
import { getStoredTokens } from "@/lib/gmail/client";
import { getUnreadCount } from "@/lib/gmail/api";

function requireAuth(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return false;
  const session = verifySessionToken(token);
  return session?.step === "full";
}

export async function GET(req: NextRequest) {
  if (!requireAuth(req))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const tokens = await getStoredTokens();
    if (!tokens) return NextResponse.json({ connected: false });
    const unreadCount = await getUnreadCount().catch(() => 0);
    return NextResponse.json({
      connected: true,
      email: tokens.email,
      connectedAt: tokens.connectedAt,
      unreadCount,
    });
  } catch (err) {
    console.error("EMAIL_ERROR:", err);
    return NextResponse.json({ error: "Failed to get status" }, { status: 500 });
  }
}

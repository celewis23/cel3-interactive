// GET: Returns connection status and unread count
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/permissions";
import { getStoredTokens } from "@/lib/gmail/client";
import { getUnreadCount } from "@/lib/gmail/api";

export async function GET(req: NextRequest) {
  const authErr = await requirePermission(req, "email", "view");
  if (authErr) return authErr;
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

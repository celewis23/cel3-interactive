export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { requirePermission, getSessionInfo } from "@/lib/admin/permissions";
import { sanityServer } from "@/lib/sanityServer";

export async function GET(req: NextRequest) {
  const authErr = await requirePermission(req, "announcements", "view");
  if (authErr) return authErr;

  try {
    const session = getSessionInfo(req);
    const userId = session?.staffId ?? null;

    const now = new Date().toISOString();

    // For owner (no staffId) just return 0 — they wrote most of them
    if (!userId) return NextResponse.json({ count: 0 });

    const count = await sanityServer.fetch<number>(
      `count(*[
        _type == "announcement" &&
        archived != true &&
        (expiryDate == null || expiryDate >= $now) &&
        !($userId in readBy)
      ])`,
      { now, userId }
    );

    return NextResponse.json({ count: count ?? 0 });
  } catch (err) {
    console.error("ANNOUNCEMENTS_UNREAD_ERR:", err);
    return NextResponse.json({ count: 0 });
  }
}

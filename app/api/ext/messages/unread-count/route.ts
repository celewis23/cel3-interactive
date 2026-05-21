import { NextRequest, NextResponse } from "next/server";
import { extGuard } from "@/lib/integrations/extMiddleware";
import { handlePreflight } from "@/lib/integrations/cors";
import { getUnreadCount } from "@/lib/messaging/service";

export const runtime = "nodejs";

export async function OPTIONS(req: NextRequest) {
  return handlePreflight(req, ["*"]);
}

export async function GET(req: NextRequest) {
  const ctx = await extGuard(req, "messaging:read");
  if (ctx instanceof NextResponse) return ctx;
  const { actor, corsHeaders } = ctx;

  try {
    const count = await getUnreadCount(actor);
    return NextResponse.json({ count }, { headers: corsHeaders });
  } catch (err) {
    console.error("EXT_UNREAD_COUNT_ERR:", err);
    return NextResponse.json({ count: 0 }, { headers: corsHeaders });
  }
}

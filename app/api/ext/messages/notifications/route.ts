import { NextRequest, NextResponse } from "next/server";
import { extGuard } from "@/lib/integrations/extMiddleware";
import { handlePreflight } from "@/lib/integrations/cors";
import { logIntegrationAudit } from "@/lib/integrations/audit";
import { listNotifications } from "@/lib/messaging/service";

export const runtime = "nodejs";

export async function OPTIONS(req: NextRequest) {
  return handlePreflight(req, ["*"]);
}

export async function GET(req: NextRequest) {
  const ctx = await extGuard(req, "messaging:notifications:read");
  if (ctx instanceof NextResponse) return ctx;
  const { actor, payload, corsHeaders } = ctx;

  try {
    const notifications = await listNotifications(actor);

    logIntegrationAudit({
      integrationId: payload.integrationId,
      clientId: payload.clientId,
      endpoint: "/api/ext/messages/notifications",
      method: "GET",
      statusCode: 200,
      success: true,
      portalUserId: payload.portalUserId,
      req,
    });

    return NextResponse.json({ notifications }, { headers: corsHeaders });
  } catch (err) {
    console.error("EXT_NOTIFICATIONS_GET_ERR:", err);
    return NextResponse.json(
      { error: "server_error", error_description: "Failed to list notifications" },
      { status: 500, headers: corsHeaders }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { extGuard } from "@/lib/integrations/extMiddleware";
import { handlePreflight } from "@/lib/integrations/cors";
import { logIntegrationAudit } from "@/lib/integrations/audit";
import { markConversationRead } from "@/lib/messaging/service";

export const runtime = "nodejs";

export async function OPTIONS(req: NextRequest) {
  return handlePreflight(req, ["*"]);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await extGuard(req, "messaging:read");
  if (ctx instanceof NextResponse) return ctx;
  const { actor, payload, corsHeaders } = ctx;

  try {
    const { id: conversationId } = await params;
    await markConversationRead(actor, conversationId);

    logIntegrationAudit({
      integrationId: payload.integrationId,
      clientId: payload.clientId,
      endpoint: `/api/ext/messages/conversations/${conversationId}/read`,
      method: "POST",
      statusCode: 200,
      success: true,
      portalUserId: payload.portalUserId,
      req,
    });

    return NextResponse.json({ ok: true }, { headers: corsHeaders });
  } catch (err) {
    console.error("EXT_MARK_READ_ERR:", err);
    return NextResponse.json(
      { error: "server_error", error_description: "Failed to mark as read" },
      { status: 500, headers: corsHeaders }
    );
  }
}

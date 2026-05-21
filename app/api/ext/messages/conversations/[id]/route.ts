import { NextRequest, NextResponse } from "next/server";
import { extGuard } from "@/lib/integrations/extMiddleware";
import { handlePreflight } from "@/lib/integrations/cors";
import { logIntegrationAudit } from "@/lib/integrations/audit";
import { getConversation } from "@/lib/messaging/service";

export const runtime = "nodejs";

export async function OPTIONS(req: NextRequest) {
  return handlePreflight(req, ["*"]);
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await extGuard(req, "conversations:read");
  if (ctx instanceof NextResponse) return ctx;
  const { actor, payload, corsHeaders } = ctx;

  try {
    const { id } = await params;
    const conversation = await getConversation(actor, id);

    if (!conversation) {
      return NextResponse.json(
        { error: "not_found", error_description: "Conversation not found" },
        { status: 404, headers: corsHeaders }
      );
    }

    logIntegrationAudit({
      integrationId: payload.integrationId,
      clientId: payload.clientId,
      endpoint: `/api/ext/messages/conversations/${id}`,
      method: "GET",
      statusCode: 200,
      success: true,
      portalUserId: payload.portalUserId,
      req,
    });

    return NextResponse.json(conversation, { headers: corsHeaders });
  } catch (err) {
    console.error("EXT_CONVERSATION_GET_ERR:", err);
    return NextResponse.json(
      { error: "server_error", error_description: "Failed to get conversation" },
      { status: 500, headers: corsHeaders }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { extGuard } from "@/lib/integrations/extMiddleware";
import { handlePreflight } from "@/lib/integrations/cors";
import { logIntegrationAudit } from "@/lib/integrations/audit";
import { sendConversationMessage } from "@/lib/messaging/service";

export const runtime = "nodejs";

export async function OPTIONS(req: NextRequest) {
  return handlePreflight(req, ["*"]);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await extGuard(req, "messaging:write");
  if (ctx instanceof NextResponse) return ctx;
  const { actor, payload, corsHeaders } = ctx;

  try {
    const { id: conversationId } = await params;
    const body = await req.json().catch(() => ({}));

    // Attachments are not supported from external apps (no Drive access)
    const result = await sendConversationMessage(
      actor,
      conversationId,
      body.body ?? ""
    );

    if ("error" in result) {
      return NextResponse.json(
        { error: "bad_request", error_description: result.error },
        { status: 400, headers: corsHeaders }
      );
    }

    logIntegrationAudit({
      integrationId: payload.integrationId,
      clientId: payload.clientId,
      endpoint: `/api/ext/messages/conversations/${conversationId}/messages`,
      method: "POST",
      statusCode: 201,
      success: true,
      portalUserId: payload.portalUserId,
      req,
    });

    return NextResponse.json(result, { status: 201, headers: corsHeaders });
  } catch (err) {
    console.error("EXT_SEND_MESSAGE_ERR:", err);
    return NextResponse.json(
      { error: "server_error", error_description: "Failed to send message" },
      { status: 500, headers: corsHeaders }
    );
  }
}

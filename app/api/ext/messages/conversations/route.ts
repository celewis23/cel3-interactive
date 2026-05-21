import { NextRequest, NextResponse } from "next/server";
import { extGuard } from "@/lib/integrations/extMiddleware";
import { handlePreflight } from "@/lib/integrations/cors";
import { getIntegrationById } from "@/lib/integrations/db";
import { logIntegrationAudit } from "@/lib/integrations/audit";
import {
  listConversations,
  startConversation,
} from "@/lib/messaging/service";

export const runtime = "nodejs";

export async function OPTIONS(req: NextRequest) {
  // We need allowed origins — attempt to get them from the token if present
  return handlePreflight(req, ["*"]);
}

export async function GET(req: NextRequest) {
  const ctx = await extGuard(req, "conversations:read");
  if (ctx instanceof NextResponse) return ctx;
  const { actor, payload, corsHeaders } = ctx;

  try {
    const search = req.nextUrl.searchParams.get("search") ?? undefined;
    const conversations = await listConversations(actor, search);

    logIntegrationAudit({
      integrationId: payload.integrationId,
      clientId: payload.clientId,
      endpoint: "/api/ext/messages/conversations",
      method: "GET",
      statusCode: 200,
      success: true,
      portalUserId: payload.portalUserId,
      req,
    });

    return NextResponse.json({ conversations }, { headers: corsHeaders });
  } catch (err) {
    console.error("EXT_CONVERSATIONS_GET_ERR:", err);
    return NextResponse.json(
      { error: "server_error", error_description: "Failed to list conversations" },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function POST(req: NextRequest) {
  const ctx = await extGuard(req, "conversations:write");
  if (ctx instanceof NextResponse) return ctx;
  const { actor, payload, corsHeaders } = ctx;

  try {
    const body = await req.json().catch(() => ({}));
    const result = await startConversation(actor, body);

    if ("error" in result) {
      return NextResponse.json(
        { error: "bad_request", error_description: result.error },
        { status: 400, headers: corsHeaders }
      );
    }

    logIntegrationAudit({
      integrationId: payload.integrationId,
      clientId: payload.clientId,
      endpoint: "/api/ext/messages/conversations",
      method: "POST",
      statusCode: 201,
      success: true,
      portalUserId: payload.portalUserId,
      req,
    });

    return NextResponse.json(result, { status: 201, headers: corsHeaders });
  } catch (err) {
    console.error("EXT_CONVERSATIONS_POST_ERR:", err);
    return NextResponse.json(
      { error: "server_error", error_description: "Failed to create conversation" },
      { status: 500, headers: corsHeaders }
    );
  }
}

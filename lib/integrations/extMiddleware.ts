/**
 * Shared guard for all /api/ext/* routes.
 * Extracts + verifies the Bearer token, checks required scope,
 * resolves the MessagingActor, and returns CORS headers.
 */
import { NextRequest, NextResponse } from "next/server";
import {
  extractBearerToken,
  verifyIntegrationToken,
  resolveActorFromToken,
  hasScope,
  type IntegrationTokenPayload,
} from "@/lib/integrations/auth";
import { getIntegrationById } from "@/lib/integrations/db";
import {
  resolveAllowedOrigin,
  buildCorsHeaders,
  handlePreflight,
} from "@/lib/integrations/cors";
import { logIntegrationAudit } from "@/lib/integrations/audit";
import type { MessagingActor } from "@/lib/messaging/auth";

export type ExtContext = {
  payload: IntegrationTokenPayload;
  actor: MessagingActor;
  corsHeaders: Record<string, string>;
};

export async function extGuard(
  req: NextRequest,
  requiredScope: string
): Promise<ExtContext | NextResponse> {
  const raw = extractBearerToken(req);
  if (!raw) {
    return NextResponse.json(
      { error: "unauthorized", error_description: "Missing Bearer token" },
      { status: 401 }
    );
  }

  const payload = verifyIntegrationToken(raw);
  if (!payload) {
    return NextResponse.json(
      { error: "unauthorized", error_description: "Invalid or expired token" },
      { status: 401 }
    );
  }

  if (!hasScope(payload, requiredScope)) {
    return NextResponse.json(
      {
        error: "forbidden",
        error_description: `Token does not have required scope: ${requiredScope}`,
      },
      { status: 403 }
    );
  }

  // Fetch integration to check allowed origins + liveness
  const integration = await getIntegrationById(payload.integrationId).catch(
    () => null
  );
  if (!integration || !integration.isActive) {
    logIntegrationAudit({
      integrationId: payload.integrationId,
      clientId: payload.clientId,
      endpoint: req.nextUrl.pathname,
      method: req.method,
      statusCode: 401,
      success: false,
      portalUserId: payload.portalUserId,
      req,
    });
    return NextResponse.json(
      { error: "unauthorized", error_description: "Integration revoked" },
      { status: 401 }
    );
  }

  // CORS check
  const allowedOrigin = resolveAllowedOrigin(req, integration.allowedOrigins);
  if (!allowedOrigin) {
    logIntegrationAudit({
      integrationId: integration.id,
      clientId: integration.clientId,
      endpoint: req.nextUrl.pathname,
      method: req.method,
      statusCode: 403,
      success: false,
      portalUserId: payload.portalUserId,
      req,
    });
    return NextResponse.json(
      { error: "forbidden", error_description: "Origin not allowed" },
      { status: 403 }
    );
  }

  const corsHeaders = buildCorsHeaders(allowedOrigin);

  // Resolve actor (portal user)
  const actor = await resolveActorFromToken(payload);
  if (!actor) {
    return NextResponse.json(
      {
        error: "unauthorized",
        error_description: "Portal user not found or suspended",
      },
      { status: 401, headers: corsHeaders }
    );
  }

  return { payload, actor, corsHeaders };
}

export function preflight(allowedOrigins: string[]) {
  return (req: NextRequest) => handlePreflight(req, allowedOrigins);
}

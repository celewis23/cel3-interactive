import { NextRequest, NextResponse } from "next/server";
import {
  getIntegrationByClientId,
  verifySecret,
  touchLastUsed,
} from "@/lib/integrations/db";
import { createIntegrationToken } from "@/lib/integrations/auth";
import {
  tokenEndpointCorsHeaders,
} from "@/lib/integrations/cors";
import { logIntegrationAudit } from "@/lib/integrations/audit";

export const runtime = "nodejs";

// ---------------------------------------------------------------------------
// OPTIONS — preflight for browser-originated token requests
// ---------------------------------------------------------------------------
export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: tokenEndpointCorsHeaders(req),
  });
}

// ---------------------------------------------------------------------------
// POST /api/integrations/token
// Body: { clientId, clientSecret }
// Returns: { accessToken, tokenType, expiresIn, scopes }
// ---------------------------------------------------------------------------
export async function POST(req: NextRequest) {
  const corsHeaders = tokenEndpointCorsHeaders(req);

  let body: { clientId?: string; clientSecret?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "invalid_request", error_description: "Body must be JSON" },
      { status: 400, headers: corsHeaders }
    );
  }

  const { clientId, clientSecret } = body;

  if (!clientId || !clientSecret) {
    return NextResponse.json(
      {
        error: "invalid_request",
        error_description: "clientId and clientSecret are required",
      },
      { status: 400, headers: corsHeaders }
    );
  }

  const integration = await getIntegrationByClientId(clientId).catch(() => null);

  // Constant-time-ish path to avoid timing attacks on client_id enumeration
  if (!integration) {
    return NextResponse.json(
      { error: "invalid_client", error_description: "Invalid credentials" },
      { status: 401, headers: corsHeaders }
    );
  }

  if (!integration.isActive) {
    logIntegrationAudit({
      integrationId: integration.id,
      clientId: integration.clientId,
      endpoint: "/api/integrations/token",
      method: "POST",
      statusCode: 401,
      success: false,
      portalUserId: integration.portalUserId,
      req,
    });
    return NextResponse.json(
      { error: "invalid_client", error_description: "Integration is revoked" },
      { status: 401, headers: corsHeaders }
    );
  }

  const secretValid = verifySecret(
    clientSecret,
    integration.secretHash,
    integration.secretSalt
  );

  if (!secretValid) {
    logIntegrationAudit({
      integrationId: integration.id,
      clientId: integration.clientId,
      endpoint: "/api/integrations/token",
      method: "POST",
      statusCode: 401,
      success: false,
      portalUserId: integration.portalUserId,
      req,
    });
    return NextResponse.json(
      { error: "invalid_client", error_description: "Invalid credentials" },
      { status: 401, headers: corsHeaders }
    );
  }

  // Optional origin check for browser-initiated token requests
  const origin = req.headers.get("origin");
  if (origin && integration.allowedOrigins.length > 0) {
    const allowed = integration.allowedOrigins.includes(origin) ||
      integration.allowedOrigins.includes("*");
    if (!allowed) {
      logIntegrationAudit({
        integrationId: integration.id,
        clientId: integration.clientId,
        endpoint: "/api/integrations/token",
        method: "POST",
        statusCode: 403,
        success: false,
        portalUserId: integration.portalUserId,
        req,
      });
      return NextResponse.json(
        { error: "access_denied", error_description: "Origin not allowed" },
        { status: 403, headers: corsHeaders }
      );
    }
  }

  const accessToken = createIntegrationToken(
    integration.id,
    integration.clientId,
    integration.portalUserId,
    integration.scopes
  );

  touchLastUsed(clientId);

  logIntegrationAudit({
    integrationId: integration.id,
    clientId: integration.clientId,
    endpoint: "/api/integrations/token",
    method: "POST",
    statusCode: 200,
    success: true,
    portalUserId: integration.portalUserId,
    req,
  });

  return NextResponse.json(
    {
      access_token: accessToken,
      token_type: "Bearer",
      expires_in: 3600,
      scopes: integration.scopes,
    },
    { headers: corsHeaders }
  );
}

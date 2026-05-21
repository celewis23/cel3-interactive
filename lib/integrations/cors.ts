import { NextRequest, NextResponse } from "next/server";

const CORS_HEADERS_BASE = {
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Authorization, Content-Type, X-Requested-With",
  "Access-Control-Max-Age": "86400",
};

/**
 * Check whether the request Origin is permitted for the given integration.
 * Returns the allowed origin string if permitted, null if not.
 * Requests with no Origin header (server-to-server) are always allowed.
 */
export function resolveAllowedOrigin(
  req: NextRequest,
  allowedOrigins: string[]
): string | null {
  const origin = req.headers.get("origin");
  if (!origin) return "*"; // server-to-server — no CORS check needed
  if (allowedOrigins.length === 0) return null; // no origins configured
  const matched = allowedOrigins.find(
    (o) => o === origin || o === "*"
  );
  return matched ? origin : null;
}

/**
 * Build CORS response headers for a permitted origin.
 */
export function buildCorsHeaders(
  origin: string
): Record<string, string> {
  return {
    ...CORS_HEADERS_BASE,
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Credentials": "false",
  };
}

/**
 * Handle OPTIONS preflight for /api/ext/* routes.
 * Call this at the top of every OPTIONS handler.
 */
export function handlePreflight(
  req: NextRequest,
  allowedOrigins: string[]
): NextResponse {
  const origin = resolveAllowedOrigin(req, allowedOrigins);
  if (!origin) {
    return new NextResponse(null, { status: 403 });
  }
  return new NextResponse(null, {
    status: 204,
    headers: buildCorsHeaders(origin),
  });
}

/**
 * Build CORS headers for the /api/integrations/token endpoint.
 * This endpoint is always reachable (server-to-server credential exchange).
 */
export function tokenEndpointCorsHeaders(req: NextRequest): Record<string, string> {
  const origin = req.headers.get("origin") ?? "*";
  return {
    ...CORS_HEADERS_BASE,
    "Access-Control-Allow-Origin": origin,
  };
}

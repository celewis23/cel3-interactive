// GET /api/admin/email/drive-config — return Google Picker config for client-side use
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken, COOKIE_NAME } from "@/lib/admin/auth";
import { getStoredTokens } from "@/lib/gmail/client";

function requireAuth(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return false;
  const session = verifySessionToken(token);
  return session?.step === "full";
}

export async function GET(req: NextRequest) {
  if (!requireAuth(req))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tokens = await getStoredTokens();

  return NextResponse.json({
    clientId: process.env.GOOGLE_WORKSPACE_CLIENT_ID ?? null,
    apiKey: process.env.GOOGLE_PICKER_API_KEY ?? null,
    accessToken: tokens?.access_token ?? null,
  });
}

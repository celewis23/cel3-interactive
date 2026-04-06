export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/permissions";
import { getAuthenticatedClient, getStoredTokens } from "@/lib/gmail/client";

export async function GET(req: NextRequest) {
  const authErr = await requirePermission(req, "drive", "view");
  if (authErr) return authErr;

  const tokens = await getStoredTokens();
  const auth = await getAuthenticatedClient();
  const tokenResult = auth
    ? await auth.oauth2Client.getAccessToken().catch(() => null)
    : null;
  const accessToken =
    typeof tokenResult === "string"
      ? tokenResult
      : tokenResult?.token ?? tokens?.access_token ?? null;

  return NextResponse.json({
    accessToken,
  });
}

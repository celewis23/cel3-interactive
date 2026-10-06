import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/permissions";
import { getAuthenticatedClient } from "@/lib/gmail/client";

export const runtime = "nodejs";

/** Large messages upload directly to Gmail to avoid the hosting request size limit. */
export async function GET(req: NextRequest) {
  const denied = await requirePermission(req, "email", "edit");
  if (denied) return denied;
  const auth = await getAuthenticatedClient();
  if (!auth) return NextResponse.json({ error: "Reconnect Gmail to send this email." }, { status: 401 });
  const token = await auth.oauth2Client.getAccessToken();
  return NextResponse.json({ accessToken: token.token }, { headers: { "Cache-Control": "no-store" } });
}

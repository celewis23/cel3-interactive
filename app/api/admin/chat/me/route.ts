export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken, COOKIE_NAME } from "@/lib/admin/auth";
import { getAuthenticatedClient } from "@/lib/gmail/client";
import { google } from "googleapis";

function requireAuth(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return false;
  return verifySessionToken(token)?.step === "full";
}

export async function GET(req: NextRequest) {
  if (!requireAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const auth = await getAuthenticatedClient();
  if (!auth) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const oauth2 = google.oauth2({ version: "v2", auth: auth.oauth2Client });
    const res = await oauth2.userinfo.get();
    return NextResponse.json({
      name: `users/${res.data.id}`,
      displayName: res.data.name ?? res.data.email ?? "Me",
    });
  } catch (err) {
    console.error("CHAT_ME_ERROR:", err);
    return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 });
  }
}

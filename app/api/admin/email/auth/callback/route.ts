// GET: OAuth callback — exchange code for tokens and store
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { createOAuthClient, storeTokens } from "@/lib/gmail/client";
import { google } from "googleapis";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error) {
    console.error("EMAIL_ERROR: OAuth error from Google:", error);
    return NextResponse.redirect(
      new URL(`/admin/email?error=${encodeURIComponent(error)}`, req.url)
    );
  }

  if (!code) {
    return NextResponse.redirect(
      new URL("/admin/email?error=no_code", req.url)
    );
  }

  // Validate state for CSRF protection
  const storedState = req.cookies.get("gmail_oauth_state")?.value;
  if (!storedState || storedState !== state) {
    return NextResponse.redirect(
      new URL("/admin/email?error=invalid_state", req.url)
    );
  }

  try {
    const oauth2Client = createOAuthClient();
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // Get user email address
    const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
    const userInfo = await oauth2.userinfo.get();
    const email = userInfo.data.email ?? "";

    await storeTokens(tokens, email);

    const response = NextResponse.redirect(
      new URL("/admin/email?connected=1", req.url)
    );
    // Clear state cookie
    response.cookies.set("gmail_oauth_state", "", { maxAge: 0, path: "/" });
    return response;
  } catch (err) {
    console.error("EMAIL_ERROR:", err);
    return NextResponse.redirect(
      new URL("/admin/email?error=token_exchange", req.url)
    );
  }
}

import { withActivity } from "@/lib/audit/withActivity";
// GET: OAuth callback — exchange code for tokens and store
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { createOAuthClient, storeTokens } from "@/lib/gmail/client";
import { google } from "googleapis";
import { oauthCallbackErrorCode, oauthErrorStatus, type OAuthCallbackStage } from "@/lib/gmail/oauthErrors";

async function handleActivityGET(req: NextRequest) {
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

  let stage: OAuthCallbackStage = "token_exchange";
  try {
    const oauth2Client = createOAuthClient();
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // Get user email address
    stage = "profile_lookup";
    const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
    const userInfo = await oauth2.userinfo.get();
    const email = userInfo.data.email;
    if (!email) throw new Error("Google account email is missing");

    stage = "connection_save";
    await storeTokens(tokens, email);

    const response = NextResponse.redirect(
      new URL("/admin/email?connected=1", req.url)
    );
    // Clear state cookie
    response.cookies.set("gmail_oauth_state", "", { maxAge: 0, path: "/" });
    return response;
  } catch (err) {
    const errorCode = oauthCallbackErrorCode(err, stage);
    // OAuth/provider errors can contain credentials and authorization codes.
    console.error("EMAIL_OAUTH_ERROR:", { stage, code: errorCode, status: oauthErrorStatus(err) });
    return NextResponse.redirect(
      new URL(`/admin/email?error=${errorCode}`, req.url)
    );
  }
}

export const GET = withActivity("/api/admin/email/auth/callback", "GET", handleActivityGET);

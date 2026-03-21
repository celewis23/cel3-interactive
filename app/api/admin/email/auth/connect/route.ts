// GET: Initiate OAuth flow — redirect to Google
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken, COOKIE_NAME } from "@/lib/admin/auth";
import { createOAuthClient, GMAIL_SCOPES } from "@/lib/gmail/client";
import crypto from "crypto";

function requireAuth(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return false;
  const session = verifySessionToken(token);
  return session?.step === "full";
}

export async function GET(req: NextRequest) {
  if (!requireAuth(req)) {
    return NextResponse.redirect(new URL("/admin/login", req.url));
  }
  try {
    const state = crypto.randomBytes(16).toString("hex");
    const oauth2Client = createOAuthClient();
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: GMAIL_SCOPES,
      state,
      prompt: "consent", // force refresh token
    });
    const response = NextResponse.redirect(authUrl);
    // Store state in httpOnly cookie for CSRF validation
    response.cookies.set("gmail_oauth_state", state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 600, // 10 minutes
      path: "/",
    });
    return response;
  } catch (err) {
    console.error("EMAIL_ERROR:", err);
    return NextResponse.redirect(
      new URL("/admin/email?error=oauth_init", req.url)
    );
  }
}

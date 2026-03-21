// GET /api/admin/email/threads?label=INBOX&q=xxx&pageToken=xxx&maxResults=20
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken, COOKIE_NAME } from "@/lib/admin/auth";
import { listThreads } from "@/lib/gmail/api";

function requireAuth(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return false;
  const session = verifySessionToken(token);
  return session?.step === "full";
}

export async function GET(req: NextRequest) {
  if (!requireAuth(req))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { searchParams } = new URL(req.url);
    const label = searchParams.get("label") ?? "INBOX";
    const q = searchParams.get("q") ?? undefined;
    const pageToken = searchParams.get("pageToken") ?? undefined;
    const maxResults = searchParams.get("maxResults")
      ? Number(searchParams.get("maxResults"))
      : 20;
    const result = await listThreads({
      labelIds: [label],
      q,
      pageToken,
      maxResults,
    });
    return NextResponse.json(result);
  } catch (err) {
    console.error("EMAIL_ERROR:", err);
    return NextResponse.json(
      { error: "Failed to list threads" },
      { status: 500 }
    );
  }
}

// GET /api/admin/email/threads?label=INBOX&q=xxx&pageToken=xxx&maxResults=20
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/permissions";
import { listThreads } from "@/lib/gmail/api";

export async function GET(req: NextRequest) {
  const authErr = await requirePermission(req, "email", "view");
  if (authErr) return authErr;
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

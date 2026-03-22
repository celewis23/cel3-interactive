// GET /api/admin/email/threads/[id] — full thread with all messages
// PATCH /api/admin/email/threads/[id] — mark as read
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/permissions";
import { getThread, markThreadRead } from "@/lib/gmail/api";
import { sanityServer } from "@/lib/sanityServer";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authErr = await requirePermission(req, "email", "view");
  if (authErr) return authErr;
  try {
    const { id } = await params;
    const [thread, link] = await Promise.all([
      getThread(id),
      sanityServer.fetch<{
        linkedRecordType: string;
        linkedRecordId: string;
        linkedRecordName: string;
      } | null>(
        `*[_type == "gmailThreadLink" && gmailThreadId == $id][0]{ linkedRecordType, linkedRecordId, linkedRecordName }`,
        { id }
      ),
    ]);
    return NextResponse.json({ thread, link: link ?? null });
  } catch (err) {
    console.error("EMAIL_ERROR:", err);
    return NextResponse.json(
      { error: "Failed to fetch thread" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authErr = await requirePermission(req, "email", "edit");
  if (authErr) return authErr;
  try {
    const { id } = await params;
    const body = await req.json();
    if (body.action === "markRead") {
      await markThreadRead(id);
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("EMAIL_ERROR:", err);
    return NextResponse.json(
      { error: "Failed to update thread" },
      { status: 500 }
    );
  }
}

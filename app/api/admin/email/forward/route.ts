import { withActivity } from "@/lib/audit/withActivity";
// POST /api/admin/email/forward — forward a message as a new email
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/permissions";
import { forwardMessage } from "@/lib/gmail/api";

async function handleActivityPOST(req: NextRequest) {
  const authErr = await requirePermission(req, "email", "edit");
  if (authErr) return authErr;
  try {
    const body = await req.json();
    const { to, cc, bcc, subject, htmlBody, originalMessageId, attachmentRefs } = body;

    if (!to?.trim())
      return NextResponse.json({ error: "to is required" }, { status: 400 });
    if (!htmlBody?.trim())
      return NextResponse.json({ error: "message is required" }, { status: 400 });

    const result = await forwardMessage({
      to: to.trim(),
      cc: cc?.trim(),
      bcc: bcc?.trim(),
      subject: subject?.trim() || "(no subject)",
      htmlBody: htmlBody.trim(),
      originalMessageId: originalMessageId ?? undefined,
      attachmentRefs: Array.isArray(attachmentRefs) ? attachmentRefs : undefined,
    });
    return NextResponse.json({ ok: true, ...result }, { status: 201 });
  } catch (err) {
    console.error("EMAIL_FORWARD_ERROR:", err);
    return NextResponse.json({ error: "Failed to forward message" }, { status: 500 });
  }
}

export const POST = withActivity("/api/admin/email/forward", "POST", handleActivityPOST);

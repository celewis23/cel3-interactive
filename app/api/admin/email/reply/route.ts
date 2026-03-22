// POST /api/admin/email/reply — reply within a thread
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/permissions";
import { replyToThread } from "@/lib/gmail/api";

export async function POST(req: NextRequest) {
  const authErr = await requirePermission(req, "email", "edit");
  if (authErr) return authErr;
  try {
    const body = await req.json();
    const {
      threadId,
      to,
      subject,
      message: emailBody,
      inReplyTo,
      references,
      cc,
    } = body;
    if (!threadId?.trim())
      return NextResponse.json(
        { error: "threadId is required" },
        { status: 400 }
      );
    if (!to?.trim())
      return NextResponse.json({ error: "to is required" }, { status: 400 });
    if (!emailBody?.trim())
      return NextResponse.json(
        { error: "message is required" },
        { status: 400 }
      );
    const result = await replyToThread({
      threadId,
      to: to.trim(),
      subject: subject ?? "(no subject)",
      body: emailBody.trim(),
      inReplyTo: inReplyTo ?? "",
      references: references ?? "",
      cc: cc?.trim(),
    });
    return NextResponse.json({ ok: true, ...result }, { status: 201 });
  } catch (err) {
    console.error("EMAIL_ERROR:", err);
    return NextResponse.json(
      { error: "Failed to send reply" },
      { status: 500 }
    );
  }
}

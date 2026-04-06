// POST /api/admin/email/send — send a new email (FormData)
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/permissions";
import { sendEmail, type MimeAttachment } from "@/lib/gmail/api";

export async function POST(req: NextRequest) {
  const authErr = await requirePermission(req, "email", "edit");
  if (authErr) return authErr;

  try {
    const formData = await req.formData();
    const to = (formData.get("to") as string | null)?.trim();
    const subject = (formData.get("subject") as string | null)?.trim();
    const htmlBody = (formData.get("htmlBody") as string | null)?.trim();
    const cc = (formData.get("cc") as string | null)?.trim() || undefined;
    const bcc = (formData.get("bcc") as string | null)?.trim() || undefined;

    if (!to) return NextResponse.json({ error: "to is required" }, { status: 400 });
    if (!subject) return NextResponse.json({ error: "subject is required" }, { status: 400 });
    if (!htmlBody) return NextResponse.json({ error: "message is required" }, { status: 400 });

    // Collect file attachments
    const attachments: MimeAttachment[] = [];
    const files = formData.getAll("attachments") as File[];
    for (const file of files) {
      if (file.size === 0) continue;
      const arrayBuffer = await file.arrayBuffer();
      attachments.push({
        filename: file.name,
        mimeType: file.type || "application/octet-stream",
        data: Buffer.from(arrayBuffer),
      });
    }

    const result = await sendEmail({
      to,
      subject,
      htmlBody,
      cc,
      bcc,
      attachments: attachments.length > 0 ? attachments : undefined,
    });

    return NextResponse.json({ ok: true, ...result }, { status: 201 });
  } catch (err) {
    console.error("EMAIL_ERROR:", err);
    const message =
      err instanceof Error && err.message.trim()
        ? err.message
        : "Failed to send email";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

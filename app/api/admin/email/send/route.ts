// POST /api/admin/email/send — send a new email (FormData)
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken, COOKIE_NAME } from "@/lib/admin/auth";
import { sendEmail, type MimeAttachment } from "@/lib/gmail/api";

function requireAuth(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return false;
  const session = verifySessionToken(token);
  return session?.step === "full";
}

export async function POST(req: NextRequest) {
  if (!requireAuth(req))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const formData = await req.formData();
    const to = (formData.get("to") as string | null)?.trim();
    const subject = (formData.get("subject") as string | null)?.trim();
    const htmlBody = (formData.get("htmlBody") as string | null)?.trim();
    const cc = (formData.get("cc") as string | null)?.trim() || undefined;

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
      attachments: attachments.length > 0 ? attachments : undefined,
    });

    return NextResponse.json({ ok: true, ...result }, { status: 201 });
  } catch (err) {
    console.error("EMAIL_ERROR:", err);
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
  }
}

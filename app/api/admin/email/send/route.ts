// POST /api/admin/email/send — send a new email
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken, COOKIE_NAME } from "@/lib/admin/auth";
import { sendEmail } from "@/lib/gmail/api";

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
    const body = await req.json();
    const { to, subject, message: emailBody, cc } = body;
    if (!to?.trim())
      return NextResponse.json({ error: "to is required" }, { status: 400 });
    if (!subject?.trim())
      return NextResponse.json(
        { error: "subject is required" },
        { status: 400 }
      );
    if (!emailBody?.trim())
      return NextResponse.json(
        { error: "message is required" },
        { status: 400 }
      );
    const result = await sendEmail({
      to: to.trim(),
      subject: subject.trim(),
      body: emailBody.trim(),
      cc: cc?.trim(),
    });
    return NextResponse.json({ ok: true, ...result }, { status: 201 });
  } catch (err) {
    console.error("EMAIL_ERROR:", err);
    return NextResponse.json(
      { error: "Failed to send email" },
      { status: 500 }
    );
  }
}

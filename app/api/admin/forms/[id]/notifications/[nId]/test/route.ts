import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken, COOKIE_NAME } from "@/lib/admin/auth";
import { sanityServer } from "@/lib/sanityServer";
import { Resend } from "resend";
import { buildNotificationEmail } from "@/lib/forms/email";
import { FormField } from "@/lib/forms";

export const runtime = "nodejs";

function requireAuth(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return false;
  const session = verifySessionToken(token);
  return session?.step === "full";
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; nId: string }> }
) {
  if (!requireAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id, nId } = await params;

  const [form, notification] = await Promise.all([
    sanityServer.fetch<{ title: string; fields: FormField[] } | null>(
      `*[_type == "cel3Form" && _id == $id][0]{ title, fields }`,
      { id }
    ),
    sanityServer.fetch<{ emailAddress: string; label?: string; includeFileLinks: boolean } | null>(
      `*[_type == "cel3FormNotification" && _id == $nId][0]`,
      { nId }
    ),
  ]);

  if (!form || !notification) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const sampleAnswers: Record<string, string> = {};
  for (const f of form.fields || []) {
    if (f.fieldType === "section_header") continue;
    sampleAnswers[f.id] = `[Sample ${f.label || f.fieldType}]`;
  }

  const { subject, html, text } = buildNotificationEmail({
    formTitle: form.title,
    submittedAt: new Date().toISOString(),
    fields: form.fields || [],
    answers: sampleAnswers,
    files: {},
    includeFileLinks: notification.includeFileLinks ?? true,
    isTest: true,
  });

  const resend = new Resend(process.env.RESEND_API_KEY);
  const { error } = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL || "CEL3 Interactive <noreply@cel3interactive.com>",
    to: [notification.emailAddress],
    subject: `[TEST] ${subject}`,
    html,
    text,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

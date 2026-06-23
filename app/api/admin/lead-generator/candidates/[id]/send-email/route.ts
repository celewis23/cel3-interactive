import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/permissions";
import { sendLeadCandidateEmail } from "@/lib/leads/service";

export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authErr = await requirePermission(req, "email", "edit");
  if (authErr) return authErr;

  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const result = await sendLeadCandidateEmail(id, {
      subject: typeof body.subject === "string" ? body.subject : undefined,
      htmlBody: typeof body.htmlBody === "string" ? body.htmlBody : undefined,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("LEAD_CANDIDATE_SEND_EMAIL_ERR:", err);
    const message = err instanceof Error ? err.message : "Failed to send lead email";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

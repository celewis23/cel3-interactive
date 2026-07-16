import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/permissions";
import {
  generateLeadIntelligenceOutreachDraft,
  sendLeadIntelligenceOutreach,
} from "@/lib/lead-intelligence/service";

export const runtime = "nodejs";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const body = await req.json().catch(() => ({}));
  const action = body.action === "send" ? "send" : "generate";
  const authErr = await requirePermission(req, action === "send" ? "email" : "leads", "edit");
  if (authErr) return authErr;

  try {
    const { id } = await params;
    if (action === "send") {
      const result = await sendLeadIntelligenceOutreach(id, {
        subject: body.subject,
        htmlBody: body.htmlBody,
      });
      return NextResponse.json(result);
    }
    const result = await generateLeadIntelligenceOutreachDraft(id);
    return NextResponse.json({ result });
  } catch (err) {
    console.error("LEAD_INTELLIGENCE_OUTREACH_ERR:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Lead Intelligence outreach failed" }, { status: 500 });
  }
}

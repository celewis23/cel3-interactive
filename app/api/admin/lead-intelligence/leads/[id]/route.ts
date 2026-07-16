import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/permissions";
import { updateLeadIntelligenceResult } from "@/lib/lead-intelligence/service";

export const runtime = "nodejs";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authErr = await requirePermission(req, "leads", "edit");
  if (authErr) return authErr;

  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const result = await updateLeadIntelligenceResult(id, {
      dismissed: body.dismissed,
      doNotContact: body.doNotContact,
      savedToListIds: body.savedToListIds,
      reviewed: body.reviewed,
      reviewNotes: body.reviewNotes,
      outreachSubject: body.outreachSubject,
      outreachBodyHtml: body.outreachBodyHtml,
      business: body.business,
    });
    return NextResponse.json({ result });
  } catch (err) {
    console.error("LEAD_INTELLIGENCE_RESULT_PATCH_ERR:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed to update Lead Intelligence result" }, { status: 500 });
  }
}

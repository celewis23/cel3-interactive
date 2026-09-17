import { withActivity } from "@/lib/audit/withActivity";
import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/permissions";
import { convertLeadIntelligenceResultToPipeline } from "@/lib/lead-intelligence/service";

export const runtime = "nodejs";

async function handleActivityPOST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authErr = await requirePermission(req, "leads", "edit");
  if (authErr) return authErr;

  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const result = await convertLeadIntelligenceResultToPipeline(id, { force: Boolean(body.force) });
    return NextResponse.json(result);
  } catch (err) {
    console.error("LEAD_INTELLIGENCE_CONVERT_ERR:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed to convert Lead Intelligence result" }, { status: 500 });
  }
}

export const POST = withActivity("/api/admin/lead-intelligence/leads/[id]/convert-to-crm", "POST", handleActivityPOST);

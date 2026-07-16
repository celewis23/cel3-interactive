import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/permissions";
import { listLeadIntelligenceResults } from "@/lib/lead-intelligence/service";

export const runtime = "nodejs";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authErr = await requirePermission(req, "leads", "view");
  if (authErr) return authErr;

  try {
    const { id } = await params;
    const results = await listLeadIntelligenceResults(id, 200);
    return NextResponse.json({ results });
  } catch (err) {
    console.error("LEAD_INTELLIGENCE_RESULTS_GET_ERR:", err);
    return NextResponse.json({ error: "Failed to load Lead Intelligence results" }, { status: 500 });
  }
}

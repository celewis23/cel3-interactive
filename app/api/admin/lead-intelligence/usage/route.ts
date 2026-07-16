import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/permissions";
import { getLeadIntelligenceUsageSummary } from "@/lib/lead-intelligence/service";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const authErr = await requirePermission(req, "leads", "view");
  if (authErr) return authErr;

  try {
    const usage = await getLeadIntelligenceUsageSummary();
    return NextResponse.json({ usage });
  } catch (err) {
    console.error("LEAD_INTELLIGENCE_USAGE_GET_ERR:", err);
    return NextResponse.json({ error: "Failed to load Lead Intelligence usage" }, { status: 500 });
  }
}

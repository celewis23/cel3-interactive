import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/permissions";
import { listLeadIntelligenceProviderConfigs } from "@/lib/lead-intelligence/service";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const authErr = await requirePermission(req, "leads", "view");
  if (authErr) return authErr;

  try {
    const providers = await listLeadIntelligenceProviderConfigs();
    return NextResponse.json({ providers });
  } catch (err) {
    console.error("LEAD_INTELLIGENCE_PROVIDERS_GET_ERR:", err);
    return NextResponse.json({ error: "Failed to load Lead Intelligence providers" }, { status: 500 });
  }
}

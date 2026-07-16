import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/permissions";
import { runLeadIntelligenceSearch } from "@/lib/lead-intelligence/service";

export const runtime = "nodejs";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authErr = await requirePermission(req, "leads", "edit");
  if (authErr) return authErr;

  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const result = await runLeadIntelligenceSearch(id, { force: Boolean(body.force) });
    return NextResponse.json(result);
  } catch (err) {
    console.error("LEAD_INTELLIGENCE_SEARCH_RUN_ERR:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed to run Lead Intelligence search" }, { status: 500 });
  }
}

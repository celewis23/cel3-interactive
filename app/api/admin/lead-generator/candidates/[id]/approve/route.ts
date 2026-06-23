import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/permissions";
import { approveLeadCandidate } from "@/lib/leads/service";

export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authErr = await requirePermission(req, "leads", "edit");
  if (authErr) return authErr;

  try {
    const { id } = await params;
    const result = await approveLeadCandidate(id);
    return NextResponse.json(result);
  } catch (err) {
    console.error("LEAD_CANDIDATE_APPROVE_ERR:", err);
    const message = err instanceof Error ? err.message : "Failed to approve lead";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

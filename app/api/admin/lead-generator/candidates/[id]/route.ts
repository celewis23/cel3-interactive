import { withActivity } from "@/lib/audit/withActivity";
import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/permissions";
import { getLeadCandidate, updateLeadCandidate } from "@/lib/leads/service";

export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authErr = await requirePermission(req, "leads", "view");
  if (authErr) return authErr;

  const { id } = await params;
  const lead = await getLeadCandidate(id);
  if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ lead });
}

async function handleActivityPATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authErr = await requirePermission(req, "leads", "edit");
  if (authErr) return authErr;

  try {
    const { id } = await params;
    const body = await req.json();
    const lead = await updateLeadCandidate(id, body);
    if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ lead });
  } catch (err) {
    console.error("LEAD_CANDIDATE_PATCH_ERR:", err);
    return NextResponse.json({ error: "Failed to update lead candidate" }, { status: 500 });
  }
}

export const PATCH = withActivity("/api/admin/lead-generator/candidates/[id]", "PATCH", handleActivityPATCH);

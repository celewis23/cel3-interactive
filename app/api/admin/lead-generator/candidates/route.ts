import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/permissions";
import { listLeadCandidates, upsertLeadCandidate } from "@/lib/leads/service";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const authErr = await requirePermission(req, "leads", "view");
  if (authErr) return authErr;

  const status = req.nextUrl.searchParams.get("status") ?? "all";
  const leads = await listLeadCandidates(status as never);
  return NextResponse.json({ leads });
}

export async function POST(req: NextRequest) {
  const authErr = await requirePermission(req, "leads", "edit");
  if (authErr) return authErr;

  try {
    const body = await req.json();
    const lead = await upsertLeadCandidate(body);
    return NextResponse.json({ lead }, { status: 201 });
  } catch (err) {
    console.error("LEAD_CANDIDATE_POST_ERR:", err);
    return NextResponse.json({ error: "Failed to save lead candidate" }, { status: 500 });
  }
}

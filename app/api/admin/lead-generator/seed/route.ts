import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/permissions";
import { seedResearchedLeadCandidates } from "@/lib/leads/service";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const authErr = await requirePermission(req, "leads", "edit");
  if (authErr) return authErr;

  try {
    const leads = await seedResearchedLeadCandidates();
    return NextResponse.json({ seeded: leads.length, leads });
  } catch (err) {
    console.error("LEAD_GENERATOR_SEED_ERR:", err);
    return NextResponse.json({ error: "Failed to seed researched leads" }, { status: 500 });
  }
}

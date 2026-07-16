import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/permissions";
import {
  createLeadIntelligenceSearch,
  listLeadIntelligenceSearches,
  runLeadIntelligenceSearch,
} from "@/lib/lead-intelligence/service";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const authErr = await requirePermission(req, "leads", "view");
  if (authErr) return authErr;

  try {
    const searches = await listLeadIntelligenceSearches(50);
    return NextResponse.json({ searches });
  } catch (err) {
    console.error("LEAD_INTELLIGENCE_SEARCHES_GET_ERR:", err);
    return NextResponse.json({ error: "Failed to load Lead Intelligence searches" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const authErr = await requirePermission(req, "leads", "edit");
  if (authErr) return authErr;

  try {
    const body = await req.json();
    const search = await createLeadIntelligenceSearch({
      name: body.name,
      description: body.description,
      naturalLanguageQuery: body.naturalLanguageQuery,
      criteria: body.criteria,
    });
    if (body.runImmediately === false) {
      return NextResponse.json({ search }, { status: 201 });
    }
    const result = await runLeadIntelligenceSearch(search._id, { force: Boolean(body.force) });
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    console.error("LEAD_INTELLIGENCE_SEARCHES_POST_ERR:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed to run Lead Intelligence search" }, { status: 500 });
  }
}

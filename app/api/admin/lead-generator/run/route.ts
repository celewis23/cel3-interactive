import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/permissions";
import { discoverLeadCandidates } from "@/lib/leads/provider";
import {
  getLeadGeneratorSettings,
  listLeadCandidates,
  updateLeadGeneratorSettings,
  upsertLeadCandidate,
} from "@/lib/leads/service";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const authErr = await requirePermission(req, "leads", "edit");
  if (authErr) return authErr;

  try {
    const settings = await getLeadGeneratorSettings();
    const existingLeads = await listLeadCandidates("all");
    const discovery = await discoverLeadCandidates(settings.maxPerRun, {
      existingLeads,
      searchLocations: settings.searchLocations,
      searchCategories: settings.searchCategories,
    });
    let saved = 0;
    for (const lead of discovery.leads) {
      await upsertLeadCandidate(lead);
      saved++;
    }

    await updateLeadGeneratorSettings({
      lastRunAt: new Date().toISOString(),
      lastRunStatus: discovery.ok ? "success" : "setup_needed",
      lastRunMessage: discovery.message,
    });

    return NextResponse.json({
      ok: discovery.ok,
      message: discovery.message,
      discovered: discovery.leads.length,
      saved,
    });
  } catch (err) {
    console.error("LEAD_GENERATOR_RUN_ERR:", err);
    const message = err instanceof Error ? err.message : "Lead discovery failed";
    await updateLeadGeneratorSettings({
      lastRunAt: new Date().toISOString(),
      lastRunStatus: "failed",
      lastRunMessage: message,
    }).catch(() => {});
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

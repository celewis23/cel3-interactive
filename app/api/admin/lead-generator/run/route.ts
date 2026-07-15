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

const RUN_TIME_BUDGET_MS = 285_000;
const MIN_RUN_TIME_REMAINING_MS = 15_000;

export async function POST(req: NextRequest) {
  const authErr = await requirePermission(req, "leads", "edit");
  if (authErr) return authErr;

  try {
    const startedAt = Date.now();
    const settings = await getLeadGeneratorSettings();
    const existingLeads = await listLeadCandidates("all");
    const discovery = await discoverLeadCandidates(settings.maxPerRun, {
      existingLeads,
      searchLocations: settings.searchLocations,
      searchCategories: settings.searchCategories,
    });
    let saved = 0;
    let stoppedForTime = false;
    for (const lead of discovery.leads) {
      if (Date.now() - startedAt > RUN_TIME_BUDGET_MS - MIN_RUN_TIME_REMAINING_MS) {
        stoppedForTime = true;
        break;
      }
      await upsertLeadCandidate(lead);
      saved++;
    }

    const message = stoppedForTime && saved < discovery.leads.length
      ? `${discovery.message} Saved ${saved} before this run hit its save time budget. Run it again for more.`
      : discovery.message;

    await updateLeadGeneratorSettings({
      lastRunAt: new Date().toISOString(),
      lastRunStatus: discovery.ok ? "success" : "setup_needed",
      lastRunMessage: message,
    });

    return NextResponse.json({
      ok: discovery.ok,
      message,
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

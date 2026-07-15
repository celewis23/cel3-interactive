import { NextRequest, NextResponse } from "next/server";
import { DateTime } from "luxon";
import { discoverLeadCandidates } from "@/lib/leads/provider";
import { shouldRunLeadGenerator } from "@/lib/leads/schedule";
import {
  getLeadGeneratorSettings,
  listLeadCandidates,
  updateLeadGeneratorSettings,
  upsertLeadCandidate,
} from "@/lib/leads/service";

export const runtime = "nodejs";

function isAuthorizedCron(req: NextRequest) {
  const secret = req.headers.get("authorization")?.replace("Bearer ", "");
  if (process.env.CRON_SECRET && secret === process.env.CRON_SECRET) return true;
  return req.headers.get("x-vercel-cron") === "1";
}

export async function GET(req: NextRequest) {
  if (!isAuthorizedCron(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const settings = await getLeadGeneratorSettings();
  const due = shouldRunLeadGenerator(settings, DateTime.utc());
  if (!due.shouldRun) {
    return NextResponse.json({ skipped: true, reason: due.reason });
  }

  try {
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
    console.error("CRON_LEAD_GENERATOR_ERR:", err);
    const message = err instanceof Error ? err.message : "Lead discovery failed";
    await updateLeadGeneratorSettings({
      lastRunAt: new Date().toISOString(),
      lastRunStatus: "failed",
      lastRunMessage: message,
    }).catch(() => {});
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

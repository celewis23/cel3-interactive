import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/permissions";
import { sanityServer } from "@/lib/sanityServer";
import { ACTIVITY_JOBS, jobHealth } from "@/lib/audit/jobs";
import { getEnforcementSettings } from "@/lib/billing/enforcementSettings";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const authErr = await requirePermission(req, "auditLog", "view");
  if (authErr) return authErr;
  try {
    const params = Object.fromEntries(ACTIVITY_JOBS.map((job, index) => [`job${index}`, job.id]));
    const query = `{${ACTIVITY_JOBS.map((job, index) => `"${job.id}": *[_type == "auditEvent" && kind == "job" && resourceId == $job${index}] | order(timestamp desc) [0]{_id, timestamp, status, description, durationMs, runId, metadata}`).join(",")}}`;
    const [runs, settings] = await Promise.all([
      sanityServer.fetch<Record<string, { timestamp: string; status?: string } | null>>(query, params),
      getEnforcementSettings().catch(() => null),
    ]);
    return NextResponse.json({ jobs: ACTIVITY_JOBS.map((job) => ({ ...job,
      lastRun: runs[job.id] ?? null,
      health: jobHealth(job.schedule, runs[job.id] ?? null),
      collectionsEnabled: job.id === "billing-enforcement" ? settings?.autoSuspendEnabled ?? null : undefined,
    })), checkedAt: new Date().toISOString() }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("ACTIVITY_JOBS_ERR:", err);
    return NextResponse.json({ error: "Scheduled-job history could not be loaded." }, { status: 500 });
  }
}

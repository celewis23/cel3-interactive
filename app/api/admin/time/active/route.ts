import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/permissions";
import { sanityServer } from "@/lib/sanityServer";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const authErr = await requirePermission(req, "timeTracking", "view");
  if (authErr) return authErr;
  try {
    const active = await sanityServer.fetch(
      `*[_type == "timeEntry" && endTime == null][0]{
        _id, date, startTime, durationSeconds, description,
        projectId, projectName, clientName, billable, hourlyRate
      }`
    );
    return NextResponse.json(active ?? null);
  } catch (err) {
    console.error("TIME_ACTIVE_GET_ERR:", err);
    return NextResponse.json({ error: "Failed to fetch active timer" }, { status: 500 });
  }
}

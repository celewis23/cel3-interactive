import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/permissions";
import { getOverview, listProjects, listSyncLogs, MeterwiseNotConfiguredError, MeterwiseApiError } from "@/lib/meterwise/client";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const authErr = await requirePermission(req, "meterwise", "view");
  if (authErr) return authErr;

  try {
    const [overview, projects, syncLogs] = await Promise.all([
      getOverview(),
      listProjects(),
      listSyncLogs(),
    ]);
    return NextResponse.json({ overview, projects, syncLogs });
  } catch (err) {
    if (err instanceof MeterwiseNotConfiguredError) {
      return NextResponse.json({ error: "not_configured" }, { status: 409 });
    }
    if (err instanceof MeterwiseApiError) {
      return NextResponse.json({ error: "meterwise_error", status: err.status, body: err.body }, { status: 502 });
    }
    return NextResponse.json({ error: "unknown_error" }, { status: 500 });
  }
}

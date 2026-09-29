import { NextRequest, NextResponse } from "next/server";
import { withActivity } from "@/lib/audit/withActivity";
import { archiveRoutineActivity } from "@/lib/audit/retention";

export const runtime = "nodejs";
export const maxDuration = 60;

async function handleActivityGET(req: NextRequest) {
  if (!process.env.CRON_SECRET || req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const result = await archiveRoutineActivity();
    return NextResponse.json({ ...result, processed: result.removed, skipped: result.archived === 0 });
  } catch (error) {
    console.error("AUDIT_RETENTION_ERR:", error instanceof Error ? error.message : "Archive unavailable");
    return NextResponse.json({ error: "Activity archive could not complete" }, { status: 500 });
  }
}

export const GET = withActivity("/api/cron/audit-retention", "GET", handleActivityGET);

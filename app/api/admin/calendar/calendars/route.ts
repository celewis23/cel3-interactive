export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/permissions";
import { listCalendars } from "@/lib/google/calendar";

export async function GET(req: NextRequest) {
  const authErr = await requirePermission(req, "calendar", "view");
  if (authErr) return authErr;

  try {
    const calendars = await listCalendars();
    return NextResponse.json(calendars);
  } catch (err) {
    console.error("CALENDAR_LIST_ERROR:", err);
    return NextResponse.json({ error: "Failed to list calendars" }, { status: 500 });
  }
}

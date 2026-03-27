export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/permissions";
import { listEvents, createEvent } from "@/lib/google/calendar";

export async function GET(req: NextRequest) {
  const authErr = await requirePermission(req, "calendar", "view");
  if (authErr) return authErr;

  const { searchParams } = new URL(req.url);
  const calendarId = searchParams.get("calendarId") ?? undefined;
  const timeMin = searchParams.get("timeMin") ?? undefined;
  const timeMax = searchParams.get("timeMax") ?? undefined;
  const q = searchParams.get("q") ?? undefined;
  const pageToken = searchParams.get("pageToken") ?? undefined;

  try {
    const result = await listEvents({ calendarId, timeMin, timeMax, q, pageToken });
    return NextResponse.json(result);
  } catch (err) {
    console.error("CALENDAR_EVENTS_ERROR:", err);
    return NextResponse.json({ error: "Failed to list events" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const authErr = await requirePermission(req, "calendar", "edit");
  if (authErr) return authErr;

  try {
    const body = await req.json();
    const { calendarId = "primary", ...params } = body;
    const event = await createEvent(calendarId, params);
    return NextResponse.json(event, { status: 201 });
  } catch (err) {
    console.error("CALENDAR_CREATE_EVENT_ERROR:", err);
    const message =
      err instanceof Error
        ? err.message
        : "Failed to create event";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

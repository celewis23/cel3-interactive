import { withActivity } from "@/lib/audit/withActivity";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/permissions";
import { updateEvent, deleteEvent } from "@/lib/google/calendar";

async function handleActivityPUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authErr = await requirePermission(req, "calendar", "edit");
  if (authErr) return authErr;
  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const calendarId = searchParams.get("calendarId") ?? "primary";

  try {
    const body = await req.json();
    const event = await updateEvent(calendarId, id, body);
    return NextResponse.json(event);
  } catch (err) {
    console.error("CALENDAR_UPDATE_EVENT_ERROR:", err);
    return NextResponse.json({ error: "Failed to update event" }, { status: 500 });
  }
}

async function handleActivityDELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authErr = await requirePermission(req, "calendar", "edit");
  if (authErr) return authErr;
  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const calendarId = searchParams.get("calendarId") ?? "primary";

  try {
    await deleteEvent(calendarId, id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("CALENDAR_DELETE_EVENT_ERROR:", err);
    return NextResponse.json({ error: "Failed to delete event" }, { status: 500 });
  }
}

export const PUT = withActivity("/api/admin/calendar/events/[id]", "PUT", handleActivityPUT);

export const DELETE = withActivity("/api/admin/calendar/events/[id]", "DELETE", handleActivityDELETE);

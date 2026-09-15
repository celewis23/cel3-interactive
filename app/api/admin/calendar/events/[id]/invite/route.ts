export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/permissions";
import { CalendarInviteError, sendEventInvites } from "@/lib/google/calendar";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authErr = await requirePermission(req, "calendar", "edit");
  if (authErr) return authErr;

  const { id } = await params;
  const calendarId = req.nextUrl.searchParams.get("calendarId") ?? "primary";
  if (!id.trim() || !calendarId.trim()) {
    return NextResponse.json({ error: "An event and calendar are required." }, { status: 400 });
  }

  try {
    const event = await sendEventInvites(calendarId, id);
    return NextResponse.json(event);
  } catch (err) {
    if (err instanceof CalendarInviteError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }

    const status = (err as { response?: { status?: number } })?.response?.status;
    if (status === 412) {
      return NextResponse.json({ error: "The event changed. Refresh the calendar before sending invites." }, { status: 409 });
    }
    if (status === 403) {
      return NextResponse.json({ error: "Google Calendar did not allow invites to be sent. Check your access to this calendar." }, { status: 403 });
    }
    if (status === 404 || status === 410) {
      return NextResponse.json({ error: "This event is no longer available. Refresh the calendar." }, { status: 404 });
    }
    console.error("CALENDAR_SEND_INVITES_ERROR:", err);
    return NextResponse.json({ error: "Could not confirm that Google Calendar sent the invites. Check the event before trying again." }, { status: 502 });
  }
}

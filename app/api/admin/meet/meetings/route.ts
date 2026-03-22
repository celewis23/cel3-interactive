export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/permissions";
import { listUpcomingMeetings, createMeeting } from "@/lib/google/meet";

export async function GET(req: NextRequest) {
  const authErr = await requirePermission(req, "meet", "view");
  if (authErr) return authErr;

  const { searchParams } = new URL(req.url);
  const calendarId = searchParams.get("calendarId") ?? undefined;
  const maxResults = searchParams.get("maxResults")
    ? Number(searchParams.get("maxResults"))
    : undefined;
  const timeMin = searchParams.get("timeMin") ?? undefined;

  try {
    const meetings = await listUpcomingMeetings({ calendarId, maxResults, timeMin });
    return NextResponse.json(meetings);
  } catch (err) {
    console.error("MEET_LIST_ERROR:", err);
    return NextResponse.json({ error: "Failed to list meetings" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const authErr = await requirePermission(req, "meet", "edit");
  if (authErr) return authErr;

  try {
    const body = await req.json();
    const { summary, description, startDateTime, endDateTime, attendeeEmails, calendarId } = body;
    const meeting = await createMeeting({ summary, description, startDateTime, endDateTime, attendeeEmails, calendarId });
    return NextResponse.json(meeting, { status: 201 });
  } catch (err) {
    console.error("MEET_CREATE_ERROR:", err);
    return NextResponse.json({ error: "Failed to create meeting" }, { status: 500 });
  }
}

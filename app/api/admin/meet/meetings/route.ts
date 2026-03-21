export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken, COOKIE_NAME } from "@/lib/admin/auth";
import { listUpcomingMeetings, createMeeting } from "@/lib/google/meet";

function requireAuth(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return false;
  return verifySessionToken(token)?.step === "full";
}

export async function GET(req: NextRequest) {
  if (!requireAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
  if (!requireAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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

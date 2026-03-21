export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken, COOKIE_NAME } from "@/lib/admin/auth";
import { listEvents, createEvent } from "@/lib/google/calendar";

function requireAuth(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return false;
  return verifySessionToken(token)?.step === "full";
}

export async function GET(req: NextRequest) {
  if (!requireAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
  if (!requireAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { calendarId = "primary", ...params } = body;
    const event = await createEvent(calendarId, params);
    return NextResponse.json(event, { status: 201 });
  } catch (err) {
    console.error("CALENDAR_CREATE_EVENT_ERROR:", err);
    return NextResponse.json({ error: "Failed to create event" }, { status: 500 });
  }
}

export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken, COOKIE_NAME } from "@/lib/admin/auth";
import { listCalendars } from "@/lib/google/calendar";

function requireAuth(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return false;
  return verifySessionToken(token)?.step === "full";
}

export async function GET(req: NextRequest) {
  if (!requireAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const calendars = await listCalendars();
    return NextResponse.json(calendars);
  } catch (err) {
    console.error("CALENDAR_LIST_ERROR:", err);
    return NextResponse.json({ error: "Failed to list calendars" }, { status: 500 });
  }
}

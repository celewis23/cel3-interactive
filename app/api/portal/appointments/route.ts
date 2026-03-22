import { NextRequest, NextResponse } from "next/server";
import { verifyPortalSessionToken, PORTAL_COOKIE } from "@/lib/portal/auth";
import { listEvents } from "@/lib/google/calendar";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const token = req.cookies.get(PORTAL_COOKIE)?.value;
  const session = token ? verifyPortalSessionToken(token) : null;
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const now = new Date().toISOString();
    const nextMonth = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    const { events } = await listEvents({
      timeMin: now,
      timeMax: nextMonth,
      maxResults: 20,
      q: session.email,
    }).catch(() => ({ events: [] }));

    return NextResponse.json(
      events.map((e) => ({
        id: e.id,
        summary: e.summary,
        start: e.start.dateTime ?? e.start.date ?? "",
        allDay: e.allDay,
        htmlLink: e.htmlLink,
      }))
    );
  } catch (err) {
    console.error("PORTAL_APPOINTMENTS_ERR:", err);
    return NextResponse.json([]);
  }
}

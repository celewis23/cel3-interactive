import { NextRequest, NextResponse } from "next/server";
import { verifyPortalSessionToken, PORTAL_COOKIE } from "@/lib/portal/auth";
import { listPortalAppointments } from "@/lib/portal/appointments";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const token = req.cookies.get(PORTAL_COOKIE)?.value;
  const session = token ? verifyPortalSessionToken(token) : null;
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const events = await listPortalAppointments(session.email);

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

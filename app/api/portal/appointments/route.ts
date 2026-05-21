import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { verifyPortalSessionToken, PORTAL_COOKIE } from "@/lib/portal/auth";
import { listPortalAppointmentsWithResponses, type PortalAppointmentResponseStatus } from "@/lib/portal/appointments";
import { sanityWriteClient } from "@/lib/sanity.write";
import { sendEmail } from "@/lib/gmail/api";

export const runtime = "nodejs";

function escapeHtml(input: string) {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function responseDocId(email: string, calendarId: string, eventId: string) {
  const hash = createHash("sha256")
    .update(`${email.trim().toLowerCase()}:${calendarId}:${eventId}`)
    .digest("hex")
    .slice(0, 32);
  return `portalAppointmentResponse.${hash}`;
}

function formatWhen(start?: string, end?: string, allDay?: boolean) {
  if (!start) return "Date not set";
  const startDate = new Date(start);
  if (Number.isNaN(startDate.getTime())) return start;
  if (allDay) {
    return startDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  }
  const startText = startDate.toLocaleString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/New_York",
    timeZoneName: "short",
  });
  if (!end) return startText;
  const endDate = new Date(end);
  if (Number.isNaN(endDate.getTime())) return startText;
  return `${startText} - ${endDate.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/New_York",
    timeZoneName: "short",
  })}`;
}

async function notifyAdmin(params: {
  email: string;
  status: PortalAppointmentResponseStatus;
  note: string;
  suggestedStart: string | null;
  suggestedEnd: string | null;
  event: {
    id: string;
    calendarId: string;
    summary: string;
    start: string;
    end: string;
    allDay: boolean;
    htmlLink?: string;
  };
}) {
  const to = process.env.ADMIN_EMAIL || process.env.ASSESSMENT_TO_EMAIL || "info@cel3interactive.com";
  const statusLabel =
    params.status === "accepted"
      ? "accepted"
      : params.status === "declined"
        ? "declined"
        : "suggested a new time for";
  const subject = `Appointment ${statusLabel}: ${params.event.summary || "Untitled event"}`;
  const suggested = params.status === "suggested_new_time"
    ? `<p><strong>Suggested time:</strong> ${escapeHtml(formatWhen(params.suggestedStart ?? undefined, params.suggestedEnd ?? undefined))}</p>`
    : "";

  try {
    await sendEmail({
      to,
      subject,
      htmlBody: `
        <div style="font-family:ui-sans-serif,system-ui;line-height:1.5;color:#111827">
          <p style="font-size:12px;text-transform:uppercase;letter-spacing:.12em;color:#0284c7;margin:0 0 10px">CEL3 Client Portal</p>
          <h2 style="margin:0 0 16px;font-size:20px">Appointment response received</h2>
          <p><strong>Client:</strong> ${escapeHtml(params.email)}</p>
          <p><strong>Response:</strong> ${escapeHtml(params.status.replaceAll("_", " "))}</p>
          <p><strong>Appointment:</strong> ${escapeHtml(params.event.summary || "Untitled event")}</p>
          <p><strong>Current time:</strong> ${escapeHtml(formatWhen(params.event.start, params.event.end, params.event.allDay))}</p>
          ${suggested}
          ${params.note ? `<p><strong>Note:</strong><br>${escapeHtml(params.note).replaceAll("\n", "<br>")}</p>` : ""}
          ${params.event.htmlLink ? `<p><a href="${escapeHtml(params.event.htmlLink)}">Open Google Calendar event</a></p>` : ""}
          <p style="font-size:12px;color:#64748b;margin-top:20px">Event ID: ${escapeHtml(params.event.calendarId)} / ${escapeHtml(params.event.id)}</p>
        </div>
      `,
    });
  } catch (err) {
    console.error("PORTAL_APPOINTMENT_NOTIFY_ERR:", err);
  }
}

export async function GET(req: NextRequest) {
  const token = req.cookies.get(PORTAL_COOKIE)?.value;
  const session = token ? verifyPortalSessionToken(token) : null;
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const events = await listPortalAppointmentsWithResponses(session.email);

    return NextResponse.json(
      events.map((e) => ({
        id: e.id,
        calendarId: e.calendarId,
        summary: e.summary,
        start: e.start.dateTime ?? e.start.date ?? "",
        end: e.end.dateTime ?? e.end.date ?? "",
        description: e.description ?? "",
        location: e.location ?? "",
        allDay: e.allDay,
        htmlLink: e.htmlLink,
        attendees: e.attendees ?? [],
        clientResponse: e.clientResponse,
      }))
    );
  } catch (err) {
    console.error("PORTAL_APPOINTMENTS_ERR:", err);
    return NextResponse.json([]);
  }
}

export async function POST(req: NextRequest) {
  const token = req.cookies.get(PORTAL_COOKIE)?.value;
  const session = token ? verifyPortalSessionToken(token) : null;
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json() as {
      eventId?: string;
      calendarId?: string;
      status?: PortalAppointmentResponseStatus;
      note?: string;
      suggestedStart?: string | null;
      suggestedEnd?: string | null;
    };

    const eventId = body.eventId?.trim();
    const calendarId = body.calendarId?.trim();
    const status = body.status;
    if (!eventId || !calendarId) {
      return NextResponse.json({ error: "Appointment is required" }, { status: 400 });
    }
    if (status !== "accepted" && status !== "declined" && status !== "suggested_new_time") {
      return NextResponse.json({ error: "Valid response status is required" }, { status: 400 });
    }
    if (status === "suggested_new_time" && !body.suggestedStart) {
      return NextResponse.json({ error: "Suggested start time is required" }, { status: 400 });
    }

    const appointments = await listPortalAppointmentsWithResponses(session.email);
    const event = appointments.find((item) => item.id === eventId && item.calendarId === calendarId);
    if (!event) return NextResponse.json({ error: "Appointment not found" }, { status: 404 });

    const email = session.email.trim().toLowerCase();
    const respondedAt = new Date().toISOString();
    const note = body.note?.trim() || "";
    const suggestedStart = body.suggestedStart || null;
    const suggestedEnd = body.suggestedEnd || null;
    const doc = {
      _id: responseDocId(email, calendarId, eventId),
      _type: "portalAppointmentResponse",
      eventKey: `${calendarId}:${eventId}`,
      eventId,
      calendarId,
      portalEmail: email,
      status,
      note: note || null,
      suggestedStart,
      suggestedEnd,
      respondedAt,
      eventSnapshot: {
        summary: event.summary,
        start: event.start.dateTime ?? event.start.date ?? "",
        end: event.end.dateTime ?? event.end.date ?? "",
        allDay: event.allDay,
        location: event.location ?? null,
        htmlLink: event.htmlLink ?? null,
      },
    };

    await sanityWriteClient.createOrReplace(doc);
    await notifyAdmin({
      email,
      status,
      note,
      suggestedStart,
      suggestedEnd,
      event: {
        id: event.id,
        calendarId: event.calendarId,
        summary: event.summary,
        start: event.start.dateTime ?? event.start.date ?? "",
        end: event.end.dateTime ?? event.end.date ?? "",
        allDay: event.allDay,
        htmlLink: event.htmlLink,
      },
    });

    return NextResponse.json({ ok: true, response: doc });
  } catch (err) {
    console.error("PORTAL_APPOINTMENT_RESPONSE_ERR:", err);
    return NextResponse.json({ error: "Failed to save appointment response" }, { status: 500 });
  }
}

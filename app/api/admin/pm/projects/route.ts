import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken, COOKIE_NAME } from "@/lib/admin/auth";
import { sanityWriteClient } from "@/lib/sanity.write";
import { sanityServer } from "@/lib/sanityServer";
import { createEvent } from "@/lib/google/calendar";

export const runtime = "nodejs";

function requireAuth(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return false;
  return verifySessionToken(token)?.step === "full";
}

const DEFAULT_COLUMNS = [
  { id: "backlog", name: "Backlog", taskIds: [] as string[] },
  { id: "in-progress", name: "In Progress", taskIds: [] as string[] },
  { id: "in-review", name: "In Review", taskIds: [] as string[] },
  { id: "done", name: "Done", taskIds: [] as string[] },
];

// Google Calendar all-day events need an exclusive end date (the day after)
function nextDay(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

export async function GET(req: NextRequest) {
  if (!requireAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const projects = await sanityServer.fetch(`
    *[_type == "pmProject"] | order(_createdAt desc) {
      _id, name, description, status, dueDate, clientRef, columns, calendarEventId, _createdAt, _updatedAt
    }
  `);

  return NextResponse.json(projects);
}

export async function POST(req: NextRequest) {
  if (!requireAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  if (!body.name?.trim()) return NextResponse.json({ error: "Name is required" }, { status: 400 });

  const dueDate: string | null = body.dueDate ?? null;

  const created = await sanityWriteClient.create({
    _type: "pmProject",
    name: body.name.trim(),
    description: body.description?.trim() ?? "",
    status: "active",
    dueDate,
    clientRef: body.clientRef ?? null,
    columns: DEFAULT_COLUMNS,
    calendarEventId: null,
  });

  // Best-effort: create a calendar event if a due date was provided
  if (dueDate) {
    try {
      const event = await createEvent("primary", {
        summary: `📋 ${body.name.trim()} — Due`,
        description: body.description?.trim() || undefined,
        start: { date: dueDate },
        end: { date: nextDay(dueDate) },
      });
      await sanityWriteClient.patch(created._id).set({ calendarEventId: event.id }).commit();
      return NextResponse.json({ ...created, calendarEventId: event.id }, { status: 201 });
    } catch (err) {
      console.error("PM_CALENDAR_CREATE_ERROR:", err);
    }
  }

  return NextResponse.json(created, { status: 201 });
}

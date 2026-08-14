export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { requirePermission, getSessionInfo } from "@/lib/admin/permissions";
import { listTaskItems, createTaskItem, type TaskKind } from "@/lib/tasks/db";
import { upsertCalendarEventForItem } from "@/lib/tasks/calendarSync";

export async function GET(req: NextRequest) {
  const authErr = await requirePermission(req, "tasks", "view");
  if (authErr) return authErr;

  const items = await listTaskItems();
  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  const authErr = await requirePermission(req, "tasks", "edit");
  if (authErr) return authErr;

  const body = await req.json().catch(() => null);
  const kind: TaskKind = body?.kind === "reminder" ? "reminder" : "task";
  const title = typeof body?.title === "string" ? body.title.trim() : "";

  if (!title) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }
  if (kind === "reminder" && !body?.remindAt) {
    return NextResponse.json({ error: "remindAt is required for reminders" }, { status: 400 });
  }

  const notes = typeof body?.notes === "string" ? body.notes.trim() || null : null;
  const dueDate = kind === "task" && typeof body?.dueDate === "string" ? body.dueDate : null;
  const notifyTime = kind === "task" ? (typeof body?.notifyTime === "string" && body.notifyTime ? body.notifyTime : "09:00") : null;
  const remindAt = kind === "reminder" ? body.remindAt : null;
  const addToCalendar = body?.addToCalendar !== false;
  const projectId = typeof body?.projectId === "string" && body.projectId ? body.projectId : null;

  const calendarFields = addToCalendar
    ? await upsertCalendarEventForItem({
        kind, title, notes, dueDate, notifyTime, remindAt,
        calendarId: null, calendarEventId: null,
      })
    : null;

  const session = getSessionInfo(req);
  const item = await createTaskItem({
    kind,
    title,
    notes,
    dueDate,
    notifyTime,
    remindAt,
    keepUntilCleared: body?.keepUntilCleared !== false,
    createdBy: session?.staffId ?? "owner",
    projectId,
    calendarId: calendarFields?.calendarId ?? null,
    calendarEventId: calendarFields?.calendarEventId ?? null,
    calendarEventLink: calendarFields?.calendarEventLink ?? null,
  });

  return NextResponse.json(item, { status: 201 });
}

export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/permissions";
import { getTaskItem, updateTaskItem, deleteTaskItem, type UpdateTaskItemInput } from "@/lib/tasks/db";
import { upsertCalendarEventForItem, deleteCalendarEventForItem } from "@/lib/tasks/calendarSync";

const SYNC_FIELDS = ["title", "notes", "dueDate", "notifyTime", "remindAt"] as const;

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authErr = await requirePermission(req, "tasks", "edit");
  if (authErr) return authErr;

  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const existing = await getTaskItem(id);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const patch: UpdateTaskItemInput = {};
  if (typeof body.title === "string") patch.title = body.title.trim();
  if ("notes" in body) patch.notes = typeof body.notes === "string" ? body.notes.trim() || null : null;
  if (body.status === "open" || body.status === "completed") patch.status = body.status;
  if ("dueDate" in body) patch.dueDate = body.dueDate ?? null;
  if ("notifyTime" in body) patch.notifyTime = body.notifyTime ?? null;
  if ("remindAt" in body) patch.remindAt = body.remindAt ?? null;
  if (typeof body.keepUntilCleared === "boolean") patch.keepUntilCleared = body.keepUntilCleared;
  if ("projectId" in body) patch.projectId = body.projectId ?? null;

  const wantsCalendarOff = body.addToCalendar === false;
  const syncFieldsChanged = SYNC_FIELDS.some((key) => key in body) || body.addToCalendar === true;

  if (wantsCalendarOff) {
    await deleteCalendarEventForItem(existing);
    patch.calendarId = null;
    patch.calendarEventId = null;
    patch.calendarEventLink = null;
  } else if (syncFieldsChanged) {
    const calendarFields = await upsertCalendarEventForItem({
      kind: existing.kind,
      title: patch.title ?? existing.title,
      notes: "notes" in patch ? patch.notes ?? null : existing.notes,
      dueDate: "dueDate" in patch ? patch.dueDate ?? null : existing.dueDate,
      notifyTime: "notifyTime" in patch ? patch.notifyTime ?? null : existing.notifyTime,
      remindAt: "remindAt" in patch ? patch.remindAt ?? null : existing.remindAt,
      calendarId: existing.calendarId,
      calendarEventId: existing.calendarEventId,
    });
    if (calendarFields) {
      patch.calendarId = calendarFields.calendarId;
      patch.calendarEventId = calendarFields.calendarEventId;
      patch.calendarEventLink = calendarFields.calendarEventLink;
    }
  }

  const updated = await updateTaskItem(id, patch);
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authErr = await requirePermission(req, "tasks", "delete");
  if (authErr) return authErr;

  const { id } = await params;
  const existing = await getTaskItem(id);
  if (existing) await deleteCalendarEventForItem(existing);
  await deleteTaskItem(id);
  return new NextResponse(null, { status: 204 });
}

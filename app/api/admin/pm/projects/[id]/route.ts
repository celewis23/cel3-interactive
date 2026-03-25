import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/permissions";
import { sanityWriteClient } from "@/lib/sanity.write";
import { sanityServer } from "@/lib/sanityServer";
import { createEvent, updateEvent, deleteEvent } from "@/lib/google/calendar";
import { logAudit, AuditAction } from "@/lib/audit/log";
import { automationEngine } from "@/lib/automations/engine";

export const runtime = "nodejs";

function nextDay(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authErr = await requirePermission(req, "projects", "view");
  if (authErr) return authErr;
  const { id } = await params;

  const project = await sanityServer.fetch(
    `*[_type == "pmProject" && _id == $id][0]`,
    { id }
  );
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(project);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authErr = await requirePermission(req, "projects", "edit");
  if (authErr) return authErr;
  const { id } = await params;
  const body = await req.json();

  // Fetch current state to know the existing dueDate and calendarEventId
  const current = await sanityServer.fetch<{
    name: string;
    description: string;
    dueDate: string | null;
    calendarEventId: string | null;
  }>(
    `*[_type == "pmProject" && _id == $id][0]{ name, description, dueDate, calendarEventId }`,
    { id }
  );

  const patch: Record<string, unknown> = {};
  const allowed = ["name", "description", "status", "dueDate", "clientRef", "columns"];
  for (const key of allowed) {
    if (key in body) patch[key] = body[key];
  }

  const updated = await sanityWriteClient.patch(id).set(patch).commit();

  logAudit(req, {
    action: AuditAction.PROJECT_UPDATED,
    resourceType: "project",
    resourceId: id,
    description: "Project updated",
  });

  // Fire automations for status transitions
  if ("status" in body) {
    automationEngine.fire("default", "project_status_changed", { status: body.status }, "project", id);
  }

  // Calendar sync — best-effort
  const newName: string = (body.name ?? current?.name ?? "").trim();
  const newDesc: string = (body.description ?? current?.description ?? "").trim();
  const newDueDate: string | null = "dueDate" in body ? (body.dueDate ?? null) : (current?.dueDate ?? null);
  const existingEventId: string | null = current?.calendarEventId ?? null;

  try {
    if (newDueDate && existingEventId) {
      // Update existing event (name, description, or date may have changed)
      await updateEvent("primary", existingEventId, {
        summary: `📋 ${newName} — Due`,
        description: newDesc || undefined,
        start: { date: newDueDate },
        end: { date: nextDay(newDueDate) },
      });
    } else if (newDueDate && !existingEventId) {
      // Due date added — create a new event
      const event = await createEvent("primary", {
        summary: `📋 ${newName} — Due`,
        description: newDesc || undefined,
        start: { date: newDueDate },
        end: { date: nextDay(newDueDate) },
      });
      await sanityWriteClient.patch(id).set({ calendarEventId: event.id }).commit();
    } else if (!newDueDate && existingEventId) {
      // Due date removed — delete the event
      await deleteEvent("primary", existingEventId);
      await sanityWriteClient.patch(id).set({ calendarEventId: null }).commit();
    }
  } catch (err) {
    console.error("PM_CALENDAR_SYNC_ERROR:", err);
  }

  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authErr = await requirePermission(req, "projects", "delete");
  if (authErr) return authErr;
  const { id } = await params;

  // Fetch project to get calendarEventId before deleting
  const project = await sanityServer.fetch<{ calendarEventId: string | null }>(
    `*[_type == "pmProject" && _id == $id][0]{ calendarEventId }`,
    { id }
  );

  // Delete all tasks and comments belonging to this project
  const tasks = await sanityServer.fetch<{ _id: string }[]>(
    `*[_type == "pmTask" && projectId == $id]{ _id }`,
    { id }
  );
  for (const task of tasks) {
    const comments = await sanityServer.fetch<{ _id: string }[]>(
      `*[_type == "pmComment" && taskId == $task]{ _id }`,
      { task: task._id }
    );
    for (const c of comments) await sanityWriteClient.delete(c._id);
    await sanityWriteClient.delete(task._id);
  }

  await sanityWriteClient.delete(id);

  logAudit(req, {
    action: AuditAction.PROJECT_DELETED,
    resourceType: "project",
    resourceId: id,
    description: "Project deleted",
  });

  // Best-effort: remove the calendar event
  if (project?.calendarEventId) {
    try {
      await deleteEvent("primary", project.calendarEventId);
    } catch (err) {
      console.error("PM_CALENDAR_DELETE_ERROR:", err);
    }
  }

  return NextResponse.json({ ok: true });
}

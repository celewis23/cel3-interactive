export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/permissions";
import { deleteTask, updateTask } from "@/lib/google/tasks";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authErr = await requirePermission(req, "calendar", "edit");
  if (authErr) return authErr;

  const { searchParams } = new URL(req.url);
  const taskListId = searchParams.get("taskListId") ?? "";
  if (!taskListId) {
    return NextResponse.json({ error: "taskListId is required" }, { status: 400 });
  }

  try {
    const { id } = await params;
    const body = await req.json();
    const task = await updateTask(taskListId, id, body);
    return NextResponse.json(task);
  } catch (err) {
    console.error("TASK_UPDATE_ERROR:", err);
    const message = err instanceof Error ? err.message : "Failed to update task";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authErr = await requirePermission(req, "calendar", "edit");
  if (authErr) return authErr;

  const { searchParams } = new URL(req.url);
  const taskListId = searchParams.get("taskListId") ?? "";
  if (!taskListId) {
    return NextResponse.json({ error: "taskListId is required" }, { status: 400 });
  }

  try {
    const { id } = await params;
    await deleteTask(taskListId, id);
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    console.error("TASK_DELETE_ERROR:", err);
    return NextResponse.json({ error: "Failed to delete task" }, { status: 500 });
  }
}

export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/permissions";
import { listTasks, createTask } from "@/lib/google/tasks";

export async function GET(req: NextRequest) {
  const authErr = await requirePermission(req, "calendar", "view");
  if (authErr) return authErr;

  const { searchParams } = new URL(req.url);
  const taskListId = searchParams.get("taskListId") ?? "";
  const q = searchParams.get("q") ?? undefined;
  const status = searchParams.get("status") ?? "all";
  const dueMin = searchParams.get("dueMin") ?? undefined;
  const dueMax = searchParams.get("dueMax") ?? undefined;

  if (!taskListId) {
    return NextResponse.json({ error: "taskListId is required" }, { status: 400 });
  }

  try {
    const tasks = await listTasks({
      taskListId,
      query: q,
      dueMin,
      dueMax,
      showCompleted: status !== "open",
      showHidden: false,
      showDeleted: false,
      maxResults: 200,
    });

    const filtered = status === "done"
      ? tasks.filter((task) => task.status === "completed")
      : status === "open"
      ? tasks.filter((task) => task.status !== "completed")
      : tasks;

    return NextResponse.json(filtered);
  } catch (err) {
    console.error("TASKS_LIST_ERROR:", err);
    return NextResponse.json({ error: "Failed to list tasks" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const authErr = await requirePermission(req, "calendar", "edit");
  if (authErr) return authErr;

  try {
    const body = await req.json();
    const task = await createTask(body.taskListId, {
      title: body.title,
      notes: body.notes,
      due: body.due,
      status: body.status,
    });
    return NextResponse.json(task, { status: 201 });
  } catch (err) {
    console.error("TASK_CREATE_ERROR:", err);
    const message = err instanceof Error ? err.message : "Failed to create task";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

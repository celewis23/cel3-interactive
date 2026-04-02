import { google } from "googleapis";
import { DateTime } from "luxon";
import { getAuthenticatedClient } from "@/lib/gmail/client";

export type GoogleTaskList = {
  id: string;
  title: string;
  updated?: string;
};

export type GoogleTask = {
  id: string;
  title: string;
  notes?: string;
  due?: string;
  status: "needsAction" | "completed";
  completed?: string;
  deleted?: boolean;
  hidden?: boolean;
  parent?: string;
  position?: string;
  updated?: string;
  selfLink?: string;
  webViewLink?: string;
  taskListId: string;
};

function mapTaskList(
  item: { id?: string | null; title?: string | null; updated?: string | null } | null | undefined
): GoogleTaskList {
  return {
    id: item?.id ?? "",
    title: item?.title ?? "Untitled List",
    updated: item?.updated ?? undefined,
  };
}

function mapTask(
  item: {
    id?: string | null;
    title?: string | null;
    notes?: string | null;
    due?: string | null;
    status?: string | null;
    completed?: string | null;
    deleted?: boolean | null;
    hidden?: boolean | null;
    parent?: string | null;
    position?: string | null;
    updated?: string | null;
    selfLink?: string | null;
    webViewLink?: string | null;
  } | null | undefined,
  taskListId: string
): GoogleTask {
  return {
    id: item?.id ?? "",
    title: item?.title ?? "(Untitled task)",
    notes: item?.notes ?? undefined,
    due: item?.due ?? undefined,
    status: item?.status === "completed" ? "completed" : "needsAction",
    completed: item?.completed ?? undefined,
    deleted: item?.deleted ?? undefined,
    hidden: item?.hidden ?? undefined,
    parent: item?.parent ?? undefined,
    position: item?.position ?? undefined,
    updated: item?.updated ?? undefined,
    selfLink: item?.selfLink ?? undefined,
    webViewLink: item?.webViewLink ?? undefined,
    taskListId,
  };
}

export async function listTaskLists(): Promise<GoogleTaskList[]> {
  const auth = await getAuthenticatedClient();
  if (!auth) throw new Error("Not authenticated with Google");

  const tasks = google.tasks({ version: "v1", auth: auth.oauth2Client });
  const res = await tasks.tasklists.list({ maxResults: 100 });

  return (res.data.items ?? []).map(mapTaskList);
}

export async function listTasks(opts: {
  taskListId: string;
  showCompleted?: boolean;
  showHidden?: boolean;
  showDeleted?: boolean;
  dueMin?: string;
  dueMax?: string;
  maxResults?: number;
  query?: string;
}): Promise<GoogleTask[]> {
  const auth = await getAuthenticatedClient();
  if (!auth) throw new Error("Not authenticated with Google");
  if (!opts.taskListId) throw new Error("taskListId is required");

  const tasks = google.tasks({ version: "v1", auth: auth.oauth2Client });
  const res = await tasks.tasks.list({
    tasklist: opts.taskListId,
    showCompleted: opts.showCompleted ?? true,
    showHidden: opts.showHidden ?? false,
    showDeleted: opts.showDeleted ?? false,
    dueMin: opts.dueMin,
    dueMax: opts.dueMax,
    maxResults: opts.maxResults ?? 100,
  });

  const items = (res.data.items ?? []).map((item) => mapTask(item, opts.taskListId));
  const query = opts.query?.trim().toLowerCase();
  if (!query) return items;

  return items.filter((task) =>
    task.title.toLowerCase().includes(query) || (task.notes ?? "").toLowerCase().includes(query)
  );
}

export async function createTask(
  taskListId: string,
  params: {
    title: string;
    notes?: string;
    due?: string;
    status?: "needsAction" | "completed";
  }
): Promise<GoogleTask> {
  const auth = await getAuthenticatedClient();
  if (!auth) throw new Error("Not authenticated with Google");
  if (!taskListId) throw new Error("taskListId is required");
  if (!params.title.trim()) throw new Error("title is required");

  const tasks = google.tasks({ version: "v1", auth: auth.oauth2Client });
  const res = await tasks.tasks.insert({
    tasklist: taskListId,
    requestBody: {
      title: params.title.trim(),
      notes: params.notes?.trim() || undefined,
      due: params.due ? normalizeDue(params.due) : undefined,
      status: params.status ?? "needsAction",
      completed: params.status === "completed" ? new Date().toISOString() : undefined,
    },
  });

  return mapTask(res.data, taskListId);
}

export async function updateTask(
  taskListId: string,
  taskId: string,
  params: Partial<{
    title: string;
    notes: string | null;
    due: string | null;
    status: "needsAction" | "completed";
  }>
): Promise<GoogleTask> {
  const auth = await getAuthenticatedClient();
  if (!auth) throw new Error("Not authenticated with Google");
  if (!taskListId || !taskId) throw new Error("taskListId and taskId are required");

  const tasks = google.tasks({ version: "v1", auth: auth.oauth2Client });
  const requestBody: Record<string, unknown> = {};

  if (params.title !== undefined) requestBody.title = params.title.trim();
  if (params.notes !== undefined) requestBody.notes = params.notes?.trim() || "";
  if (params.due !== undefined) requestBody.due = params.due ? normalizeDue(params.due) : null;
  if (params.status !== undefined) {
    requestBody.status = params.status;
    requestBody.completed = params.status === "completed" ? new Date().toISOString() : null;
  }

  const res = await tasks.tasks.patch({
    tasklist: taskListId,
    task: taskId,
    requestBody,
  });

  return mapTask(res.data, taskListId);
}

export async function deleteTask(taskListId: string, taskId: string): Promise<void> {
  const auth = await getAuthenticatedClient();
  if (!auth) throw new Error("Not authenticated with Google");
  if (!taskListId || !taskId) throw new Error("taskListId and taskId are required");

  const tasks = google.tasks({ version: "v1", auth: auth.oauth2Client });
  await tasks.tasks.delete({
    tasklist: taskListId,
    task: taskId,
  });
}

function normalizeDue(value: string): string {
  const iso = DateTime.fromISO(value, { zone: "local" }).toUTC().toISO();
  return iso ?? value;
}

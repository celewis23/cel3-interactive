import { randomUUID } from "crypto";
import { sql } from "@/lib/postgres";

export type TaskKind = "task" | "reminder";
export type TaskStatus = "open" | "completed";

export interface TaskItem {
  id: string;
  kind: TaskKind;
  title: string;
  notes: string | null;
  status: TaskStatus;
  dueDate: string | null;
  notifyTime: string | null;
  remindAt: string | null;
  keepUntilCleared: boolean;
  lastNotifiedDate: string | null;
  lastNotifiedAt: string | null;
  createdBy: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  projectId: string | null;
  calendarId: string | null;
  calendarEventId: string | null;
  calendarEventLink: string | null;
}

type TaskItemRow = {
  id: string;
  kind: TaskKind;
  title: string;
  notes: string | null;
  status: TaskStatus;
  due_date: string | null;
  notify_time: string | null;
  remind_at: string | null;
  keep_until_cleared: boolean;
  last_notified_date: string | null;
  last_notified_at: string | null;
  created_by: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  project_id: string | null;
  calendar_id: string | null;
  calendar_event_id: string | null;
  calendar_event_link: string | null;
};

function fromRow(row: TaskItemRow): TaskItem {
  return {
    id: row.id,
    kind: row.kind,
    title: row.title,
    notes: row.notes,
    status: row.status,
    dueDate: row.due_date,
    notifyTime: row.notify_time,
    remindAt: row.remind_at,
    keepUntilCleared: row.keep_until_cleared,
    lastNotifiedDate: row.last_notified_date,
    lastNotifiedAt: row.last_notified_at,
    createdBy: row.created_by,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    projectId: row.project_id,
    calendarId: row.calendar_id,
    calendarEventId: row.calendar_event_id,
    calendarEventLink: row.calendar_event_link,
  };
}

const SELECT_COLUMNS = `
  id, kind, title, notes, status, due_date, notify_time, remind_at,
  keep_until_cleared, last_notified_date, last_notified_at, created_by,
  completed_at, created_at, updated_at, project_id, calendar_id,
  calendar_event_id, calendar_event_link
`;

export async function listTaskItems(): Promise<TaskItem[]> {
  const rows = await sql.query<TaskItemRow>(
    `SELECT ${SELECT_COLUMNS} FROM task_items
     ORDER BY (status = 'open') DESC, created_at DESC`
  );
  return rows.map(fromRow);
}

export async function getTaskItem(id: string): Promise<TaskItem | null> {
  const rows = await sql.query<TaskItemRow>(`SELECT ${SELECT_COLUMNS} FROM task_items WHERE id = $1`, [id]);
  return rows[0] ? fromRow(rows[0]) : null;
}

export interface CreateTaskItemInput {
  kind: TaskKind;
  title: string;
  notes?: string | null;
  dueDate?: string | null;
  notifyTime?: string | null;
  remindAt?: string | null;
  keepUntilCleared: boolean;
  createdBy?: string | null;
  projectId?: string | null;
  calendarId?: string | null;
  calendarEventId?: string | null;
  calendarEventLink?: string | null;
}

export async function createTaskItem(input: CreateTaskItemInput): Promise<TaskItem> {
  const id = randomUUID();
  const rows = await sql.query<TaskItemRow>(
    `INSERT INTO task_items (
       id, kind, title, notes, due_date, notify_time, remind_at, keep_until_cleared, created_by,
       project_id, calendar_id, calendar_event_id, calendar_event_link
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
     RETURNING ${SELECT_COLUMNS}`,
    [
      id,
      input.kind,
      input.title,
      input.notes ?? null,
      input.dueDate ?? null,
      input.notifyTime ?? null,
      input.remindAt ?? null,
      input.keepUntilCleared,
      input.createdBy ?? null,
      input.projectId ?? null,
      input.calendarId ?? null,
      input.calendarEventId ?? null,
      input.calendarEventLink ?? null,
    ]
  );
  return fromRow(rows[0]);
}

export interface UpdateTaskItemInput {
  title?: string;
  notes?: string | null;
  status?: TaskStatus;
  dueDate?: string | null;
  notifyTime?: string | null;
  remindAt?: string | null;
  keepUntilCleared?: boolean;
  projectId?: string | null;
  calendarId?: string | null;
  calendarEventId?: string | null;
  calendarEventLink?: string | null;
}

const UPDATABLE_COLUMNS: Record<keyof UpdateTaskItemInput, string> = {
  title: "title",
  notes: "notes",
  status: "status",
  dueDate: "due_date",
  notifyTime: "notify_time",
  remindAt: "remind_at",
  keepUntilCleared: "keep_until_cleared",
  projectId: "project_id",
  calendarId: "calendar_id",
  calendarEventId: "calendar_event_id",
  calendarEventLink: "calendar_event_link",
};

export async function updateTaskItem(id: string, patch: UpdateTaskItemInput): Promise<TaskItem | null> {
  const sets: string[] = ["updated_at = now()"];
  const values: unknown[] = [];

  for (const key of Object.keys(patch) as (keyof UpdateTaskItemInput)[]) {
    const column = UPDATABLE_COLUMNS[key];
    if (!column) continue;
    values.push(patch[key]);
    sets.push(`${column} = $${values.length}`);
  }

  if (patch.status === "completed") {
    sets.push("completed_at = now()");
  } else if (patch.status === "open") {
    sets.push("completed_at = null");
  }

  values.push(id);
  const rows = await sql.query<TaskItemRow>(
    `UPDATE task_items SET ${sets.join(", ")} WHERE id = $${values.length} RETURNING ${SELECT_COLUMNS}`,
    values
  );
  return rows[0] ? fromRow(rows[0]) : null;
}

export async function deleteTaskItem(id: string): Promise<void> {
  await sql.query(`DELETE FROM task_items WHERE id = $1`, [id]);
}

/** Open tasks whose notify_time matches the given local "HH:mm" and haven't fired yet today. */
export async function listDueTasks(nowLocalHHmm: string, todayLocalDate: string): Promise<TaskItem[]> {
  const rows = await sql.query<TaskItemRow>(
    `SELECT ${SELECT_COLUMNS} FROM task_items
     WHERE kind = 'task' AND status = 'open' AND notify_time = $1
       AND (last_notified_date IS NULL OR last_notified_date < $2)`,
    [nowLocalHHmm, todayLocalDate]
  );
  return rows.map(fromRow);
}

/** Open reminders whose remind_at has passed and haven't fired yet. */
export async function listDueReminders(nowIso: string): Promise<TaskItem[]> {
  const rows = await sql.query<TaskItemRow>(
    `SELECT ${SELECT_COLUMNS} FROM task_items
     WHERE kind = 'reminder' AND status = 'open' AND remind_at IS NOT NULL
       AND remind_at <= $1 AND last_notified_at IS NULL`,
    [nowIso]
  );
  return rows.map(fromRow);
}

export async function markTaskNotified(id: string, todayLocalDate: string): Promise<void> {
  await sql.query(`UPDATE task_items SET last_notified_date = $1, updated_at = now() WHERE id = $2`, [todayLocalDate, id]);
}

export async function listTaskItemsByProject(projectId: string): Promise<TaskItem[]> {
  const rows = await sql.query<TaskItemRow>(
    `SELECT ${SELECT_COLUMNS} FROM task_items
     WHERE project_id = $1
     ORDER BY (status = 'open') DESC, created_at DESC`,
    [projectId]
  );
  return rows.map(fromRow);
}

export async function markReminderNotified(id: string, keepUntilCleared: boolean): Promise<void> {
  if (keepUntilCleared) {
    await sql.query(`UPDATE task_items SET last_notified_at = now(), updated_at = now() WHERE id = $1`, [id]);
  } else {
    await sql.query(
      `UPDATE task_items SET last_notified_at = now(), status = 'completed', completed_at = now(), updated_at = now() WHERE id = $1`,
      [id]
    );
  }
}

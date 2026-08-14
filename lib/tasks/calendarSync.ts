import { DateTime } from "luxon";
import { createEvent, updateEvent, deleteEvent } from "@/lib/google/calendar";
import type { TaskItem } from "@/lib/tasks/db";

const ADMIN_TIMEZONE = "America/New_York";
const EVENT_DURATION_MINUTES = 30;

export interface CalendarLinkFields {
  calendarId: string | null;
  calendarEventId: string | null;
  calendarEventLink: string | null;
}

type SyncableItem = Pick<TaskItem, "kind" | "title" | "notes" | "dueDate" | "notifyTime" | "remindAt" | "calendarId" | "calendarEventId">;

function computeEventWindow(item: SyncableItem): { start: string; end: string } | null {
  if (item.kind === "task") {
    if (!item.dueDate) return null;
    const time = item.notifyTime || "09:00";
    const start = DateTime.fromFormat(`${item.dueDate} ${time}`, "yyyy-MM-dd HH:mm", { zone: ADMIN_TIMEZONE });
    if (!start.isValid) return null;
    return { start: start.toISO()!, end: start.plus({ minutes: EVENT_DURATION_MINUTES }).toISO()! };
  }

  if (!item.remindAt) return null;
  const start = DateTime.fromISO(item.remindAt);
  if (!start.isValid) return null;
  return { start: start.toISO()!, end: start.plus({ minutes: EVENT_DURATION_MINUTES }).toISO()! };
}

/** Creates, updates, or removes the linked Google Calendar event to match the item's current fields. */
export async function upsertCalendarEventForItem(item: SyncableItem): Promise<CalendarLinkFields | null> {
  const window = computeEventWindow(item);

  if (!window) {
    if (item.calendarId && item.calendarEventId) {
      await deleteCalendarEventForItem(item);
      return { calendarId: null, calendarEventId: null, calendarEventLink: null };
    }
    return null;
  }

  try {
    if (item.calendarId && item.calendarEventId) {
      const updated = await updateEvent(item.calendarId, item.calendarEventId, {
        summary: item.title,
        description: item.notes ?? undefined,
        start: { dateTime: window.start },
        end: { dateTime: window.end },
      });
      return { calendarId: updated.calendarId, calendarEventId: updated.id, calendarEventLink: updated.htmlLink ?? null };
    }

    const created = await createEvent("primary", {
      summary: item.title,
      description: item.notes ?? undefined,
      start: { dateTime: window.start },
      end: { dateTime: window.end },
    });
    return { calendarId: created.calendarId, calendarEventId: created.id, calendarEventLink: created.htmlLink ?? null };
  } catch (err) {
    console.error("TASK_CALENDAR_SYNC_ERR:", err);
    return null;
  }
}

export async function deleteCalendarEventForItem(item: Pick<TaskItem, "calendarId" | "calendarEventId">): Promise<void> {
  if (!item.calendarId || !item.calendarEventId) return;
  try {
    await deleteEvent(item.calendarId, item.calendarEventId);
  } catch (err) {
    console.error("TASK_CALENDAR_DELETE_ERR:", err);
  }
}

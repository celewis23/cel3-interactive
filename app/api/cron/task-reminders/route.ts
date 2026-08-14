import { NextRequest, NextResponse } from "next/server";
import { DateTime } from "luxon";
import { listDueTasks, listDueReminders, markTaskNotified, markReminderNotified } from "@/lib/tasks/db";
import { sendPushNotificationToAudience } from "@/lib/notifications/push";

export const runtime = "nodejs";

const ADMIN_TIMEZONE = "America/New_York";

function isAuthorizedCron(req: NextRequest) {
  const secret = req.headers.get("authorization")?.replace("Bearer ", "");
  if (process.env.CRON_SECRET && secret === process.env.CRON_SECRET) return true;
  return req.headers.get("x-vercel-cron") === "1";
}

export async function GET(req: NextRequest) {
  if (!isAuthorizedCron(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = DateTime.now().setZone(ADMIN_TIMEZONE);
  const nowHHmm = now.toFormat("HH:mm");
  const today = now.toFormat("yyyy-MM-dd");

  const [dueTasks, dueReminders] = await Promise.all([
    listDueTasks(nowHHmm, today),
    listDueReminders(new Date().toISOString()),
  ]);

  let sent = 0;

  for (const task of dueTasks) {
    await sendPushNotificationToAudience(
      {
        title: task.title,
        body: task.notes || "Task due today",
        href: "/admin/tasks",
        tag: `task-${task.id}`,
        requireInteraction: task.keepUntilCleared,
      },
      { module: "tasks", action: "view" }
    );
    await markTaskNotified(task.id, today);
    sent += 1;
  }

  for (const reminder of dueReminders) {
    await sendPushNotificationToAudience(
      {
        title: reminder.title,
        body: reminder.notes || "Reminder",
        href: "/admin/tasks",
        tag: `reminder-${reminder.id}`,
        requireInteraction: reminder.keepUntilCleared,
      },
      { module: "tasks", action: "view" }
    );
    await markReminderNotified(reminder.id, reminder.keepUntilCleared);
    sent += 1;
  }

  return NextResponse.json({ tasksNotified: dueTasks.length, remindersNotified: dueReminders.length, sent });
}

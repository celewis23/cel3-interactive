import deployment from "@/vercel.json";

export const ACTIVITY_JOBS = [
  { id: "billing-enforcement", route: "/api/cron/billing-enforcement", name: "Overdue invoice collections", description: "Checks invoices, sends reminders, and applies the saved collections rules." },
  { id: "task-reminders", route: "/api/cron/task-reminders", name: "Task reminders", description: "Checks for due tasks and reminders." },
  { id: "lead-generator", route: "/api/cron/lead-generator", name: "Lead discovery", description: "Checks every minute; discovery follows your lead generator schedule." },
  { id: "email-notifications", route: "/api/admin/notifications/email", name: "Email notifications", description: "Checks for new email and sends configured notifications." },
  { id: "campaigns", route: "/api/cron/campaigns", name: "Scheduled campaigns", description: "Sends campaigns whose scheduled time has arrived." },
  { id: "automation-processor", route: "/api/admin/automations/process-pending", name: "Delayed automations", description: "Resumes delayed automation steps and checks scheduled triggers." },
].map((job) => ({ ...job, schedule: deployment.crons.find((cron) => cron.path === job.route)?.schedule ?? null }));

export function findActivityJob(route: string, method: string) {
  // This GET is only a health check, not an automation execution.
  if (route === "/api/admin/automations/process-pending" && method === "GET") return undefined;
  return ACTIVITY_JOBS.find((job) => job.route === route);
}

export function jobHealth(schedule: string | null, lastRun: { timestamp: string; status?: string } | null, now = Date.now()) {
  if (!lastRun) return "unobserved";
  const age = now - Date.parse(lastRun.timestamp);
  if (lastRun.status === "running" && age > 10 * 60_000) return "unfinished";
  if (schedule === "* * * * *" && age > 10 * 60_000) return "overdue";
  if (schedule === "0 13 * * *") {
    const expected = new Date(now);
    expected.setUTCHours(13, 0, 0, 0);
    if (expected.getTime() > now - 15 * 60_000) expected.setUTCDate(expected.getUTCDate() - 1);
    if (Date.parse(lastRun.timestamp) < expected.getTime()) return "overdue";
  }
  return lastRun.status ?? "recorded";
}

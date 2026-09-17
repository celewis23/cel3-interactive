import { randomUUID } from "node:crypto";
import type { NextRequest } from "next/server";
import { activityContext, type ActivityStatus, type ActivitySource } from "./context";
import { findActivityJob } from "./jobs";
import { writeAudit } from "./log";

const COUNT_KEYS = ["firstNotice", "secondNotice", "interruptionNotice", "suspended", "restored", "vercelSyncFailed", "errors", "processed", "sent", "failed", "saved", "discovered", "notified", "total", "tasksNotified", "remindersNotified", "triggered", "overdueCount", "skippedNotices", "lateFeeConfirmed"];

export function jobOutcome(body: Record<string, unknown>, httpStatus: number) {
  const counts = Object.fromEntries(COUNT_KEYS.flatMap((key) => typeof body[key] === "number" ? [[key, body[key]]] : []));
  const failures = Number(counts.errors ?? 0) + Number(counts.failed ?? 0) + Number(counts.vercelSyncFailed ?? 0)
    + (Array.isArray(body.errors) ? body.errors.length : 0);
  const work = ["firstNotice", "secondNotice", "interruptionNotice", "suspended", "restored", "sent", "saved", "notified", "processed", "triggered", "tasksNotified", "remindersNotified", "lateFeeConfirmed"]
    .reduce((sum, key) => sum + Number(counts[key] ?? 0), 0);
  let status: ActivityStatus = "success";
  if (httpStatus >= 400 || body.ok === false || body.success === false || body.error || failures) status = work ? "partial" : "failed";
  else if (body.skipped === true || work === 0) status = "skipped";
  const reason = typeof body.reason === "string" ? body.reason : status === "skipped" ? "Checked; no work was due." : null;
  return { status, counts, reason, routine: status === "skipped" };
}

async function responseSummary(response: Response): Promise<Record<string, unknown> | null> {
  if (!response.headers.get("content-type")?.includes("application/json")) return null;
  const reader = response.clone().body?.getReader();
  if (!reader) return null;
  const decoder = new TextDecoder();
  let text = "", size = 0;
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      size += chunk.value.length;
      if (size > 65536) return null;
      text += decoder.decode(chunk.value, { stream: true });
    }
    const body: unknown = JSON.parse(text + decoder.decode());
    return body && typeof body === "object" && !Array.isArray(body) ? body as Record<string, unknown> : null;
  } catch { return null; }
  finally { void reader.cancel().catch(() => {}); }
}

/** Track every website mutation without storing request bodies, cookies,
 * query strings, uploaded files, or response payloads. Rich domain events
 * replace generic success rows; failures and job summaries are always kept. */
export function withActivity<Args extends unknown[]>(route: string, method: string,
  handler: (req: NextRequest, ...args: Args) => Promise<Response>) {
  return async (req: NextRequest, ...args: Args): Promise<Response> => {
    const job = findActivityJob(route, method);
    const source = job ? "automatic" : route.startsWith("/api/ext/") || route.startsWith("/api/integrations/") ? "external" : "manual";
    const started = Date.now();
    const runId = randomUUID();
    const timestamp = new Date(started).toISOString();
    const words = route.replace(/^\/api\/(admin\/|portal\/|ext\/)?/, "").split("/").filter((word) => !word.startsWith("["));
    const label = job?.name ?? words.map((word) => word.replace(/-/g, " ").replace(/^./, (s) => s.toUpperCase())).join(" / ");
    const segments = new URL(req.url).pathname.split("/");
    const recordIds = route.split("/").flatMap((segment, index) =>
      /^\[(?:id|[a-zA-Z]+Id)\]$/.test(segment) && /^[a-zA-Z0-9._-]{1,200}$/.test(segments[index] ?? "") ? [segments[index]] : []);
    const base = {
      id: `activity.${runId}`, timestamp, runId, source: source as ActivitySource,
      kind: job ? "job" as const : "request" as const,
      action: job ? `job.${job.id}` : `request.${words.join(".")}.${method.toLowerCase()}`,
      resourceType: job ? "job" : words[0] ?? "website",
      resourceId: job?.id ?? recordIds.at(-1) ?? null,
      resourceLabel: label,
    };
    const actor = job || source === "external" ? { userId: null, userName: job?.name ?? "External integration", userEmail: "", isOwner: false } : undefined;
    return activityContext.run({ runId, source, pending: [], eventsWritten: 0 }, async () => {
      const context = activityContext.getStore()!;
      const flush = async () => { while (context.pending.length) await Promise.allSettled(context.pending.splice(0)); };
      // A process killed mid-run leaves a visible running record, not a false success.
      if (job) await writeAudit(req, { ...base, status: "running", description: `${label} started`, metadata: { route, method } }, actor);
      try {
        const response = await handler(req, ...args);
        let outcome: ReturnType<typeof jobOutcome> | null = null;
        const body = await responseSummary(response);
        if (body && (job || body.ok === false || body.success === false || body.error || body.skipped === true
          || Number(body.failed ?? 0) > 0 || Number(body.errors ?? 0) > 0 || Array.isArray(body.errors) && body.errors.length > 0)) {
          outcome = jobOutcome(body, response.status);
          if (!job) outcome.reason = null;
        }
        await flush();
        const status = outcome?.status ?? (response.status >= 400 ? "failed" : response.status === 202
          || response.headers.get("content-type")?.includes("text/event-stream") ? "accepted" : "success");
        if (job || context.eventsWritten === 0 || status !== "success") {
          const verb = { success: "completed", failed: "failed", partial: "completed with errors", skipped: "skipped", accepted: "accepted for processing", running: "started" }[status];
          await writeAudit(req, { ...base, status, durationMs: Date.now() - started, routine: outcome?.routine,
            description: `${label} ${verb}${outcome?.reason ? ` — ${outcome.reason}` : ""}`,
            metadata: { route, method, httpStatus: response.status, ...(outcome?.counts ?? {}), finishedAt: new Date().toISOString() },
          }, actor);
        }
        return response;
      } catch (error) {
        await flush();
        await writeAudit(req, { ...base, status: "failed", durationMs: Date.now() - started,
          description: `${label} failed before completing.`, metadata: { route, method, httpStatus: 500, finishedAt: new Date().toISOString() },
        }, actor);
        throw error;
      }
    });
  };
}

export const runtime = "nodejs";

/**
 * Processes pending delayed automation steps whose execute_at time has passed.
 * Call this route from a cron job (e.g. Vercel Cron, external scheduler) every 5 minutes.
 * Also handles scheduled trigger checks (overdue invoices, task due-soon, etc.)
 *
 * Secured via CRON_SECRET header to prevent unauthorised execution.
 */

import { NextRequest, NextResponse } from "next/server";
import { sanityServer } from "@/lib/sanityServer";
import { sanityWriteClient } from "@/lib/sanity.write";
import { AutomationEngine } from "@/lib/automations/engine";

export async function POST(req: NextRequest) {
  // Simple secret check for cron security
  const secret = req.headers.get("x-cron-secret");
  const expected = process.env.CRON_SECRET;
  if (expected && secret !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const engine = new AutomationEngine();
  const results: Record<string, number> = { processed: 0, failed: 0, triggered: 0 };

  try {
    // ── 1. Process pending delay steps ──────────────────────────────────────
    const now = new Date().toISOString();
    const pendingSteps = await sanityServer.fetch<Array<{
      _id: string;
      runId: string;
      nodeId: string;
      inputData: Record<string, unknown>;
    }>>(
      `*[_type == "automationRunStep" && status == "pending" && executeAt <= $now] [0...100] {
        _id, runId, nodeId, inputData
      }`,
      { now }
    );

    for (const step of pendingSteps) {
      try {
        // Mark as running
        await sanityWriteClient.patch(step._id).set({
          status: "running",
          executedAt: new Date().toISOString(),
        }).commit();

        // Fetch the full run to get context
        const run = await sanityServer.fetch<{
          automationId: string;
          triggeredByEntityType: string;
          triggeredByEntityId: string;
          triggeredByClientId?: string;
          triggerType: string;
          triggerConfig?: Record<string, unknown>;
          isDryRun?: boolean;
        } | null>(
          `*[_type == "automationRun" && _id == $id][0]{
            automationId, triggeredByEntityType, triggeredByEntityId,
            triggeredByClientId, triggerType, triggerConfig, isDryRun
          }`,
          { id: step.runId }
        );

        if (!run) {
          await sanityWriteClient.patch(step._id).set({ status: "failed", error: "Run not found" }).commit();
          results.failed++;
          continue;
        }

        // Resume execution from this node
        await engine.resumeFromPendingStep(step.runId, step.nodeId, run.automationId, run.isDryRun ?? false);
        results.processed++;
      } catch (err) {
        await sanityWriteClient.patch(step._id).set({
          status: "failed",
          error: err instanceof Error ? err.message : String(err),
        }).commit();
        results.failed++;
      }
    }

    // ── 2. Scheduled trigger checks ──────────────────────────────────────────
    const { searchParams } = new URL(req.url);
    const runTriggerChecks = searchParams.get("checks") !== "false";

    if (runTriggerChecks) {
      const today = new Date();
      const todayStr = today.toISOString().split("T")[0];
      const tomorrowStr = new Date(today.getTime() + 86400000).toISOString().split("T")[0];

      // Check overdue invoices
      const overdueInvoices = await sanityServer.fetch<Array<{ _id: string; clientId?: string }>>(
        `*[_type == "invoice" && status == "sent" && dueDate < $today] [0...50] { _id, clientId }`,
        { today: todayStr }
      );
      for (const inv of overdueInvoices) {
        // Check we haven't already fired this trigger today
        const alreadyFired = await sanityServer.fetch<number>(
          `count(*[_type == "automationRun" && triggeredByEntityId == $id && triggerType == "invoice_overdue" && startedAt > $since])`,
          { id: inv._id, since: new Date(today.setHours(0,0,0,0)).toISOString() }
        );
        if (!alreadyFired) {
          await engine.fire("default", "invoice_overdue", {}, "invoice", inv._id, inv.clientId);
          // Mark invoice as overdue
          await sanityWriteClient.patch(inv._id).set({ status: "overdue" }).commit();
          results.triggered++;
        }
      }

      // Check tasks due tomorrow
      const dueTasks = await sanityServer.fetch<Array<{ _id: string }>>(
        `*[_type == "pmTask" && dueDate == $tomorrow && status != "completed"] [0...50] { _id }`,
        { tomorrow: tomorrowStr }
      );
      for (const task of dueTasks) {
        await engine.fire("default", "task_due_soon", {}, "task", task._id);
        results.triggered++;
      }
    }

    return NextResponse.json({ ok: true, ...results });
  } catch (err) {
    console.error("PROCESS_PENDING_ERR:", err);
    return NextResponse.json({ error: "Processing failed", ...results }, { status: 500 });
  }
}

// Also accept GET for simple health/ping from uptime checkers
export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  const expected = process.env.CRON_SECRET;
  if (expected && secret !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ ok: true, message: "Automation processor is healthy" });
}

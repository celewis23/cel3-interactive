export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/permissions";
import { sanityServer } from "@/lib/sanityServer";
import { AutomationEngine } from "@/lib/automations/engine";
import type { AutomationTriggerType } from "@/lib/automations/types";

export async function POST(req: NextRequest) {
  const authErr = await requirePermission(req, "automations", "view");
  if (authErr) return authErr;

  try {
    const body = await req.json() as {
      automationId: string;
      entityId?: string;
      entityType?: string;
    };

    if (!body.automationId) {
      return NextResponse.json({ error: "automationId required" }, { status: 400 });
    }

    const automation = await sanityServer.fetch<{
      _id: string;
      name: string;
      triggerType: AutomationTriggerType;
      triggerConfig?: Record<string, unknown>;
      nodes: { nodes: unknown[] };
    } | null>(
      `*[_type == "automation" && _id == $id][0]{ _id, name, triggerType, triggerConfig, nodes }`,
      { id: body.automationId }
    );

    if (!automation) {
      return NextResponse.json({ error: "Automation not found" }, { status: 404 });
    }

    const engine = new AutomationEngine();
    const runId = await engine.dryRun(
      automation as Parameters<typeof engine.dryRun>[0],
      {
        orgId: "default",
        triggerType: automation.triggerType,
        triggerConfig: automation.triggerConfig ?? {},
        entityType: body.entityType ?? automation.triggerType.split("_")[0],
        entityId: body.entityId ?? "test-entity",
        clientId: undefined,
      }
    );

    // Fetch the run + steps
    const [run, steps] = await Promise.all([
      sanityServer.fetch(
        `*[_type == "automationRun" && _id == $id][0]{ _id, status, startedAt, completedAt, isDryRun, error, branchPath }`,
        { id: runId }
      ),
      sanityServer.fetch(
        `*[_type == "automationRunStep" && runId == $runId] | order(_createdAt asc) {
          _id, nodeId, nodeType, nodeLabel, status, outputData, error, executeAt, executedAt
        }`,
        { runId }
      ),
    ]);

    return NextResponse.json({ run, steps, status: (run as { status: string })?.status ?? "completed" });
  } catch (err) {
    console.error("TEST_RUN_ERR:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Test run failed" }, { status: 500 });
  }
}

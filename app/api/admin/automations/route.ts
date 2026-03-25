export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { requirePermission, getSessionInfo } from "@/lib/admin/permissions";
import { sanityServer } from "@/lib/sanityServer";
import { sanityWriteClient } from "@/lib/sanity.write";
import { generateNodeId, type AutomationTriggerType } from "@/lib/automations/types";

export async function GET(req: NextRequest) {
  const authErr = await requirePermission(req, "automations", "view");
  if (authErr) return authErr;

  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status"); // "enabled" | "disabled" | "errors"
    const limit  = parseInt(searchParams.get("limit") ?? "50", 10);
    const offset = parseInt(searchParams.get("offset") ?? "0", 10);

    const filters: string[] = [`_type == "automation"`];
    if (status === "enabled")  filters.push(`enabled == true`);
    if (status === "disabled") filters.push(`enabled == false`);

    const where = filters.join(" && ");

    const [automations, total] = await Promise.all([
      sanityServer.fetch(
        `*[${where}] | order(_createdAt desc) [${offset}...${offset + limit}] {
          _id, name, description, triggerType, triggerConfig, enabled,
          runCount, lastRunAt, createdBy, _createdAt, _updatedAt,
          "nodeCount": length(nodes.nodes),
          "conditionCount": length(nodes.nodes[type == "condition"]),
          "recentRuns": *[_type == "automationRun" && automationId == ^._id] | order(startedAt desc) [0...5] {
            _id, status, startedAt, triggeredByClientId
          }
        }`
      ),
      sanityServer.fetch<number>(`count(*[${where}])`),
    ]);

    return NextResponse.json({ automations, total, limit, offset });
  } catch (err) {
    console.error("AUTOMATIONS_GET_ERR:", err);
    return NextResponse.json({ error: "Failed to fetch automations" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const authErr = await requirePermission(req, "automations", "edit");
  if (authErr) return authErr;

  try {
    const session = getSessionInfo(req);
    const body = await req.json() as {
      name?: string;
      description?: string;
      triggerType?: AutomationTriggerType;
      templateId?: string;
    };

    // If cloning a template, fetch its nodes
    let nodes = {
      nodes: [
        {
          id: generateNodeId(),
          type: "trigger" as const,
          position: { x: 0, y: 0 },
          config: { trigger_type: body.triggerType ?? "manual" },
          next: null,
        },
      ],
    };

    if (body.templateId) {
      const template = await sanityServer.fetch<{ nodes: typeof nodes; name: string; triggerType: AutomationTriggerType } | null>(
        `*[_type == "automationTemplate" && _id == $id][0]{ nodes, name, triggerType }`,
        { id: body.templateId }
      );
      if (template) {
        nodes = template.nodes;
      }
    }

    const automation = await sanityWriteClient.create({
      _type: "automation",
      name: body.name ?? "Untitled automation",
      description: body.description ?? "",
      triggerType: body.triggerType ?? "manual",
      triggerConfig: {},
      nodes,
      enabled: false,
      runCount: 0,
      lastRunAt: null,
      createdBy: session?.staffId ?? null,
    });

    return NextResponse.json(automation, { status: 201 });
  } catch (err) {
    console.error("AUTOMATION_CREATE_ERR:", err);
    return NextResponse.json({ error: "Failed to create automation" }, { status: 500 });
  }
}

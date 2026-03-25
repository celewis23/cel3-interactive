export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/permissions";
import { sanityServer } from "@/lib/sanityServer";
import { sanityWriteClient } from "@/lib/sanity.write";
import type { AutomationNodeGraph, AutomationTriggerType } from "@/lib/automations/types";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authErr = await requirePermission(req, "automations", "view");
  if (authErr) return authErr;

  const { id } = await params;

  try {
    const automation = await sanityServer.fetch(
      `*[_type == "automation" && _id == $id][0] {
        _id, name, description, triggerType, triggerConfig,
        nodes, enabled, runCount, lastRunAt, createdBy, _createdAt, _updatedAt
      }`,
      { id }
    );
    if (!automation) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(automation);
  } catch (err) {
    console.error("AUTOMATION_GET_ERR:", err);
    return NextResponse.json({ error: "Failed to fetch automation" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authErr = await requirePermission(req, "automations", "edit");
  if (authErr) return authErr;

  const { id } = await params;

  try {
    const body = await req.json() as {
      name?: string;
      description?: string;
      triggerType?: AutomationTriggerType;
      triggerConfig?: Record<string, unknown>;
      nodes?: AutomationNodeGraph;
      enabled?: boolean;
    };

    const patch: Record<string, unknown> = {};
    if (body.name        !== undefined) patch.name        = body.name;
    if (body.description !== undefined) patch.description = body.description;
    if (body.triggerType !== undefined) patch.triggerType = body.triggerType;
    if (body.triggerConfig !== undefined) patch.triggerConfig = body.triggerConfig;
    if (body.nodes       !== undefined) patch.nodes       = body.nodes;
    if (body.enabled     !== undefined) patch.enabled     = body.enabled;

    const updated = await sanityWriteClient.patch(id).set(patch).commit();
    return NextResponse.json(updated);
  } catch (err) {
    console.error("AUTOMATION_PATCH_ERR:", err);
    return NextResponse.json({ error: "Failed to update automation" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authErr = await requirePermission(req, "automations", "delete");
  if (authErr) return authErr;

  const { id } = await params;

  try {
    // Delete all related runs + steps
    const runs = await sanityServer.fetch<{ _id: string }[]>(
      `*[_type == "automationRun" && automationId == $id]{ _id }`,
      { id }
    );
    for (const run of runs) {
      await sanityWriteClient
        .delete({ query: `*[_type == "automationRunStep" && runId == $runId]`, params: { runId: run._id } });
    }
    await sanityWriteClient
      .delete({ query: `*[_type == "automationRun" && automationId == $id]`, params: { id } });
    await sanityWriteClient.delete(id);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("AUTOMATION_DELETE_ERR:", err);
    return NextResponse.json({ error: "Failed to delete automation" }, { status: 500 });
  }
}

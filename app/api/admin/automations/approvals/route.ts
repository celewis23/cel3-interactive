export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { requirePermission, getSessionInfo } from "@/lib/admin/permissions";
import { sanityServer } from "@/lib/sanityServer";
import { sanityWriteClient } from "@/lib/sanity.write";

export async function GET(req: NextRequest) {
  const authErr = await requirePermission(req, "automations", "view");
  if (authErr) return authErr;

  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") ?? "pending";

    const approvals = await sanityServer.fetch(
      `*[_type == "automationApproval" && status == $status] | order(requestedAt desc) [0...50] {
        _id, runId, nodeId, automationId, automationName, actionDescription,
        clientName, entityType, entityId, requestedAt, approvedBy, approvedAt, status
      }`,
      { status }
    );

    return NextResponse.json({ approvals });
  } catch (err) {
    console.error("APPROVALS_GET_ERR:", err);
    return NextResponse.json({ error: "Failed to fetch approvals" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const authErr = await requirePermission(req, "automations", "manage");
  if (authErr) return authErr;

  try {
    const session = getSessionInfo(req);
    const body = await req.json() as { approvalId: string; action: "approve" | "reject" };

    if (!body.approvalId || !body.action) {
      return NextResponse.json({ error: "approvalId and action required" }, { status: 400 });
    }

    const approval = await sanityServer.fetch<{ _id: string; runId: string; nodeId: string; automationId: string } | null>(
      `*[_type == "automationApproval" && _id == $id][0]{ _id, runId, nodeId, automationId }`,
      { id: body.approvalId }
    );
    if (!approval) return NextResponse.json({ error: "Approval not found" }, { status: 404 });

    await sanityWriteClient.patch(body.approvalId).set({
      status: body.action === "approve" ? "approved" : "rejected",
      approvedBy: session?.staffId ?? null,
      approvedAt: new Date().toISOString(),
    }).commit();

    // If approved, resume the automation run step
    if (body.action === "approve") {
      // Import and invoke engine inline to resume (dynamic import to avoid circular)
      const { AutomationEngine } = await import("@/lib/automations/engine");
      const engine = new AutomationEngine();
      // Fire the pending step
      await engine.resumeApprovedStep(approval.runId, approval.nodeId, approval.automationId);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("APPROVAL_ACTION_ERR:", err);
    return NextResponse.json({ error: "Failed to process approval" }, { status: 500 });
  }
}

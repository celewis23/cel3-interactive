import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/permissions";
import { sanityServer } from "@/lib/sanityServer";
import { sanityWriteClient } from "@/lib/sanity.write";
import { logAudit, AuditAction } from "@/lib/audit/log";
import { automationEngine } from "@/lib/automations/engine";

export const runtime = "nodejs";

const ALLOWED_FIELDS = [
  "name",
  "email",
  "phone",
  "company",
  "source",
  "notes",
  "owner",
  "stage",
  "estimatedValue",
  "driveFileUrl",
  "driveFileName",
  "followUpEventId",
  "stripeCustomerId",
] as const;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authErr = await requirePermission(req, "leads", "view");
  if (authErr) return authErr;

  try {
    const { id } = await params;
    const contact = await sanityServer.fetch(
      `*[_type == "pipelineContact" && _id == $id][0] {
        _id, _type, _createdAt,
        name, email, phone, company, source, notes, owner,
        stage, stageEnteredAt, estimatedValue, stripeCustomerId,
        closedAt, driveFileUrl, driveFileName, followUpEventId
      }`,
      { id }
    );
    if (!contact) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(contact);
  } catch (err) {
    console.error("PIPELINE_CONTACT_GET_ERR:", err);
    return NextResponse.json({ error: "Failed to fetch contact" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authErr = await requirePermission(req, "leads", "edit");
  if (authErr) return authErr;

  try {
    const { id } = await params;
    const body = await req.json();

    // Fetch current contact to detect stage change
    const current = await sanityServer.fetch<{ stage: string; closedAt: string | null } | null>(
      `*[_type == "pipelineContact" && _id == $id][0]{ stage, closedAt }`,
      { id }
    );
    if (!current) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Build patch object from allowed fields only
    const patch: Record<string, unknown> = {};
    for (const field of ALLOWED_FIELDS) {
      if (field in body) {
        patch[field] = body[field];
      }
    }

    const stageChanging = "stage" in body && body.stage !== current.stage;
    const now = new Date().toISOString();

    if (stageChanging) {
      patch.stageEnteredAt = now;
      const newStage = body.stage as string;
      if (newStage === "won" || newStage === "lost") {
        patch.closedAt = now;
      }

      // Create stage_change activity
      await sanityWriteClient.create({
        _type: "pipelineActivity",
        contactId: id,
        type: "stage_change",
        text: `Moved from ${current.stage} to ${newStage}`,
        fromStage: current.stage,
        toStage: newStage,
        author: "Admin",
      });
    }

    const updated = await sanityWriteClient.patch(id).set(patch).commit();

    logAudit(req, {
      action: AuditAction.LEAD_UPDATED,
      resourceType: "contact",
      resourceId: id,
      description: "Lead updated",
    });

    // Fire automations for stage changes
    if (stageChanging) {
      const newStage = body.stage as string;
      automationEngine.fire("default", "lead_stage_changed", { stage: newStage }, "contact", id);
      if (newStage === "won")  automationEngine.fire("default", "lead_won",  {}, "contact", id);
      if (newStage === "lost") automationEngine.fire("default", "lead_lost", {}, "contact", id);
    }

    return NextResponse.json(updated);
  } catch (err) {
    console.error("PIPELINE_CONTACT_PATCH_ERR:", err);
    return NextResponse.json({ error: "Failed to update contact" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authErr = await requirePermission(req, "leads", "delete");
  if (authErr) return authErr;

  try {
    const { id } = await params;

    // Delete all activities for this contact
    const activities = await sanityServer.fetch<{ _id: string }[]>(
      `*[_type == "pipelineActivity" && contactId == $id]{ _id }`,
      { id }
    );
    for (const activity of activities) {
      await sanityWriteClient.delete(activity._id);
    }

    // Delete the contact
    await sanityWriteClient.delete(id);

    logAudit(req, {
      action: AuditAction.LEAD_DELETED,
      resourceType: "contact",
      resourceId: id,
      description: "Lead deleted",
    });

    return NextResponse.json({ deleted: true });
  } catch (err) {
    console.error("PIPELINE_CONTACT_DELETE_ERR:", err);
    return NextResponse.json({ error: "Failed to delete contact" }, { status: 500 });
  }
}

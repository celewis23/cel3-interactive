import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/permissions";
import { sanityServer } from "@/lib/sanityServer";
import { sanityWriteClient } from "@/lib/sanity.write";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const authErr = await requirePermission(req, "onboarding", "view");
  if (authErr) return authErr;
  const { id } = await params;
  try {
    const instance = await sanityServer.fetch(
      `*[_type == "onboardingInstance" && _id == $id][0]`,
      { id }
    );
    if (!instance) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(instance);
  } catch (err) {
    console.error("ONBOARDING_INSTANCE_GET_ERR:", err);
    return NextResponse.json({ error: "Failed to fetch instance" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const authErr = await requirePermission(req, "onboarding", "edit");
  if (authErr) return authErr;
  const { id } = await params;
  try {
    const body = await req.json();

    const current = await sanityServer.fetch<{
      steps: Array<{
        _key: string;
        status: string;
        completedAt: string | null;
        title: string;
        description: string | null;
        dueDate: string | null;
        actionType: string;
        order: number;
        notes: string | null;
      }>;
      status: string;
    } | null>(`*[_type == "onboardingInstance" && _id == $id][0]{ steps, status }`, { id });

    if (!current) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const patch: Record<string, unknown> = {};

    // Step update: { stepKey, stepStatus, stepNotes }
    if (body.stepKey) {
      const now = new Date().toISOString();
      const updatedSteps = current.steps.map((s) => {
        if (s._key !== body.stepKey) return s;
        return {
          ...s,
          status: body.stepStatus ?? s.status,
          notes: "stepNotes" in body ? (body.stepNotes ?? null) : s.notes,
          completedAt:
            body.stepStatus === "complete" && !s.completedAt
              ? now
              : body.stepStatus !== "complete"
              ? null
              : s.completedAt,
        };
      });
      patch.steps = updatedSteps;

      // Auto-complete instance if all steps are done (complete or skipped)
      const allDone = updatedSteps.every((s) => ["complete", "skipped"].includes(s.status));
      if (allDone && current.status === "active") {
        patch.status = "completed";
      }
    }

    // Instance-level fields
    if ("status" in body && !body.stepKey) patch.status = body.status;
    if ("clientName" in body) patch.clientName = body.clientName?.trim() || null;
    if ("clientEmail" in body) patch.clientEmail = body.clientEmail?.trim() || null;
    if ("clientCompany" in body) patch.clientCompany = body.clientCompany?.trim() || null;
    if ("startDate" in body) patch.startDate = body.startDate;
    if ("notes" in body) patch.notes = body.notes?.trim() || null;
    if ("pipelineContactId" in body) patch.pipelineContactId = body.pipelineContactId || null;
    if ("portalUserId" in body) patch.portalUserId = body.portalUserId || null;
    if ("stripeCustomerId" in body) patch.stripeCustomerId = body.stripeCustomerId || null;

    // Allow full step array replacement (for reordering/editing from detail)
    if ("steps" in body && !body.stepKey) patch.steps = body.steps;

    const updated = await sanityWriteClient.patch(id).set(patch).commit();
    return NextResponse.json(updated);
  } catch (err) {
    console.error("ONBOARDING_INSTANCE_PATCH_ERR:", err);
    return NextResponse.json({ error: "Failed to update instance" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const authErr = await requirePermission(req, "onboarding", "delete");
  if (authErr) return authErr;
  const { id } = await params;
  try {
    await sanityWriteClient.delete(id);
    return NextResponse.json({ deleted: true });
  } catch (err) {
    console.error("ONBOARDING_INSTANCE_DELETE_ERR:", err);
    return NextResponse.json({ error: "Failed to delete instance" }, { status: 500 });
  }
}

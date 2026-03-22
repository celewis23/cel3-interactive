import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/permissions";
import { sanityServer } from "@/lib/sanityServer";
import { sanityWriteClient } from "@/lib/sanity.write";
import { logAudit, AuditAction } from "@/lib/audit/log";

export const runtime = "nodejs";

const ALLOWED_FIELDS = [
  "clientName",
  "clientEmail",
  "clientCompany",
  "pipelineContactId",
  "stripeCustomerId",
  "portalUserId",
  "projectId",
  "projectName",
  "templateId",
  "templateName",
  "category",
  "date",
  "expiryDate",
  "status",
  "body",
  "variables",
  "notes",
  "signerName",
];

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const authErr = await requirePermission(req, "contracts", "view");
  if (authErr) return authErr;
  try {
    const { id } = await params;
    const contract = await sanityServer.fetch(`*[_type == "contract" && _id == $id][0]`, { id });
    if (!contract) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(contract);
  } catch (err) {
    console.error("CONTRACTS_GET_ERR:", err);
    return NextResponse.json({ error: "Failed to fetch contract" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const authErr = await requirePermission(req, "contracts", "edit");
  if (authErr) return authErr;
  try {
    const { id } = await params;
    const body = await req.json();

    const current = await sanityServer.fetch<{
      status: string;
      sentAt: string | null;
      viewedAt: string | null;
      signedAt: string | null;
      declinedAt: string | null;
    } | null>(`*[_type == "contract" && _id == $id][0]{ status, sentAt, viewedAt, signedAt, declinedAt }`, { id });

    if (!current) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const patch: Record<string, unknown> = {};
    for (const field of ALLOWED_FIELDS) {
      if (field in body) patch[field] = body[field];
    }

    // Status transition timestamps
    const newStatus = patch.status as string | undefined;
    if (newStatus === "sent" && !current.sentAt) patch.sentAt = new Date().toISOString();
    if (newStatus === "viewed" && !current.viewedAt) patch.viewedAt = new Date().toISOString();
    if (newStatus === "signed" && !current.signedAt) patch.signedAt = new Date().toISOString();
    if (newStatus === "declined" && !current.declinedAt) patch.declinedAt = new Date().toISOString();

    const updated = await sanityWriteClient.patch(id).set(patch).commit();

    logAudit(req, {
      action: AuditAction.CONTRACT_UPDATED,
      resourceType: "contract",
      resourceId: id,
      description: `Contract updated`,
      before: current as Record<string, unknown>,
      after: patch,
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error("CONTRACTS_PATCH_ERR:", err);
    return NextResponse.json({ error: "Failed to update contract" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const authErr = await requirePermission(req, "contracts", "delete");
  if (authErr) return authErr;
  try {
    const { id } = await params;
    await sanityWriteClient.delete(id);

    logAudit(req, {
      action: AuditAction.CONTRACT_DELETED,
      resourceType: "contract",
      resourceId: id,
      description: `Contract deleted`,
    });

    return NextResponse.json({ deleted: true });
  } catch (err) {
    console.error("CONTRACTS_DELETE_ERR:", err);
    return NextResponse.json({ error: "Failed to delete contract" }, { status: 500 });
  }
}

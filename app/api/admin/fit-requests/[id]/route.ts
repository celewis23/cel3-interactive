import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/permissions";
import { sanityServer } from "@/lib/sanityServer";
import { sanityWriteClient } from "@/lib/sanity.write";

export const runtime = "nodejs";

const ALLOWED_STATUSES = new Set(["new", "contacted", "qualified", "not_fit", "archived"]);

const FIT_REQUEST_PROJECTION = `{
  _id,
  _createdAt,
  name,
  "leadEmail": coalesce(leadEmail, select(defined(email.threadKey) => null, email)),
  company,
  website,
  budget,
  timeline,
  services,
  message,
  source,
  "status": coalesce(status, "new"),
  createdAt,
  threadKey,
  "emailMeta": select(defined(email.threadKey) => email, null),
  adminNotes,
  contactedAt,
  pipelineContactId
}`;

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authErr = await requirePermission(req, "leads", "edit");
  if (authErr) return authErr;

  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({})) as Record<string, unknown>;

    const patch: Record<string, unknown> = {};

    if ("status" in body) {
      const status = typeof body.status === "string" ? body.status : "";
      if (!ALLOWED_STATUSES.has(status)) {
        return NextResponse.json({ error: "Invalid status" }, { status: 400 });
      }
      patch.status = status;
      if (status === "contacted" && !("contactedAt" in body)) {
        patch.contactedAt = new Date().toISOString();
      }
    }

    if ("adminNotes" in body) {
      patch.adminNotes = typeof body.adminNotes === "string" ? body.adminNotes : null;
    }

    if ("pipelineContactId" in body) {
      patch.pipelineContactId = typeof body.pipelineContactId === "string" && body.pipelineContactId.trim()
        ? body.pipelineContactId.trim()
        : null;
    }

    if ("contactedAt" in body) {
      patch.contactedAt = typeof body.contactedAt === "string" && body.contactedAt.trim()
        ? body.contactedAt.trim()
        : null;
    }

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: "No changes provided" }, { status: 400 });
    }

    await sanityWriteClient.patch(id).set(patch).commit();

    const updated = await sanityServer.fetch(
      `*[_type == "fitRequest" && _id == $id][0]${FIT_REQUEST_PROJECTION}`,
      { id }
    );

    if (!updated) return NextResponse.json({ error: "Fit request not found" }, { status: 404 });
    return NextResponse.json(updated);
  } catch (err) {
    console.error("ADMIN_FIT_REQUEST_PATCH_ERR:", err);
    return NextResponse.json({ error: "Failed to update fit request" }, { status: 500 });
  }
}

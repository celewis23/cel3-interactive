import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/permissions";
import { sanityServer } from "@/lib/sanityServer";
import { sanityWriteClient } from "@/lib/sanity.write";
import { logAudit, AuditAction } from "@/lib/audit/log";
import { automationEngine } from "@/lib/automations/engine";
import { syncVercelWebsiteStatus } from "@/lib/billing/websiteStatusSync";

export const runtime = "nodejs";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authErr = await requirePermission(req, "clients", "edit");
  if (authErr) return authErr;

  try {
    const { id } = await params;
    const body = await req.json();
    const status = body.status;
    if (status !== "suspended" && status !== "active") {
      return NextResponse.json({ error: "status must be 'suspended' or 'active'" }, { status: 400 });
    }

    const current = await sanityServer.fetch<{
      name: string | null;
      vercelProjectId: string | null;
      vercelDomain: string | null;
    } | null>(
      `*[_type == "pipelineContact" && _id == $id][0]{ name, vercelProjectId, vercelDomain }`,
      { id }
    );
    if (!current) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const now = new Date().toISOString();
    const patch: Record<string, unknown> =
      status === "suspended"
        ? { websiteStatus: "suspended", websiteStatusReason: "manual", websiteSuspendedAt: now }
        : { websiteStatus: "active", websiteStatusReason: null, websiteRestoredAt: now };

    await sanityWriteClient.patch(id).set(patch).commit();

    const vercelSync = await syncVercelWebsiteStatus(current, status);

    logAudit(req, {
      action: status === "suspended" ? AuditAction.CLIENT_WEBSITE_SUSPENDED : AuditAction.CLIENT_WEBSITE_RESTORED,
      resourceType: "contact",
      resourceId: id,
      resourceLabel: current.name ?? undefined,
      description: status === "suspended"
        ? `Website suspended for ${current.name ?? "client"}`
        : `Website restored for ${current.name ?? "client"}`,
    });

    automationEngine.fire("default", "client_status_changed", { websiteStatus: status }, "contact", id, id);

    return NextResponse.json({ ok: true, websiteStatus: status, vercelSync });
  } catch (err) {
    console.error("PIPELINE_CONTACT_WEBSITE_STATUS_ERR:", err);
    return NextResponse.json({ error: "Failed to update website status" }, { status: 500 });
  }
}

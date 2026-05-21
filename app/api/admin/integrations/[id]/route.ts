import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/permissions";
import {
  getIntegrationById,
  revokeIntegration,
  regenerateSecret,
} from "@/lib/integrations/db";

export const runtime = "nodejs";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authErr = await requirePermission(req, "settings", "edit");
  if (authErr) return authErr;

  try {
    const { id } = await params;
    const integration = await getIntegrationById(id);
    if (!integration) {
      return NextResponse.json({ error: "Integration not found" }, { status: 404 });
    }

    const body = await req.json();
    const action: string = body.action;

    if (action === "revoke") {
      await revokeIntegration(id);
      const updated = await getIntegrationById(id);
      return NextResponse.json({ integration: updated });
    }

    if (action === "regenerate") {
      const secret = await regenerateSecret(id);
      const updated = await getIntegrationById(id);
      return NextResponse.json({
        integration: updated,
        secret,
        warning: "Save this secret now. It will not be shown again.",
      });
    }

    return NextResponse.json({ error: "Unknown action. Use 'revoke' or 'regenerate'" }, { status: 400 });
  } catch (err) {
    console.error("ADMIN_INTEGRATION_PATCH_ERR:", err);
    return NextResponse.json({ error: "Failed to update integration" }, { status: 500 });
  }
}

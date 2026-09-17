import { withActivity } from "@/lib/audit/withActivity";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/permissions";
import { clearTokens } from "@/lib/gmail/client";
import { logAudit, AuditAction } from "@/lib/audit/log";

async function handleActivityPOST(req: NextRequest) {
  const authErr = await requirePermission(req, "settings", "manage");
  if (authErr) return authErr;

  try {
    await clearTokens();

    logAudit(req, {
      action: AuditAction.SETTINGS_UPDATED,
      resourceType: "integration",
      resourceId: "google",
      description: "Google Workspace integration disconnected",
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("INTEGRATIONS_DISCONNECT_ERR:", err);
    return NextResponse.json({ error: "Failed to disconnect" }, { status: 500 });
  }
}

export const POST = withActivity("/api/admin/integrations/google/disconnect", "POST", handleActivityPOST);

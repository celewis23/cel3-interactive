import { NextRequest, NextResponse } from "next/server";
import { requirePermission, getSessionInfo } from "@/lib/admin/permissions";
import { getEnforcementSettings, saveEnforcementSettings } from "@/lib/billing/enforcementSettings";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const authErr = await requirePermission(req, "settings", "manage");
  if (authErr) return authErr;
  const settings = await getEnforcementSettings();
  return NextResponse.json(settings);
}

export async function POST(req: NextRequest) {
  const authErr = await requirePermission(req, "settings", "manage");
  if (authErr) return authErr;

  try {
    const body = await req.json();
    const autoSuspendEnabled = Boolean(body.autoSuspendEnabled);
    const daysLateThreshold = Number(body.daysLateThreshold);
    if (!Number.isFinite(daysLateThreshold) || daysLateThreshold < 1) {
      return NextResponse.json({ error: "daysLateThreshold must be a positive number" }, { status: 400 });
    }

    const session = getSessionInfo(req);
    const settings = await saveEnforcementSettings({
      autoSuspendEnabled,
      daysLateThreshold: Math.round(daysLateThreshold),
      updatedBy: session?.staffId ?? (session?.isOwner ? "owner" : null),
    });
    return NextResponse.json(settings);
  } catch (err) {
    console.error("BILLING_ENFORCEMENT_CONFIG_ERR:", err);
    return NextResponse.json({ error: "Failed to save settings" }, { status: 500 });
  }
}

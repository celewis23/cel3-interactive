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
    const fields = {
      firstNoticeDays: Number(body.firstNoticeDays),
      secondNoticeDays: Number(body.secondNoticeDays),
      finalNoticeDays: Number(body.finalNoticeDays),
      suspendDays: Number(body.suspendDays),
      lateFeeCents: Number(body.lateFeeCents),
    };
    for (const [key, value] of Object.entries(fields)) {
      if (!Number.isFinite(value) || value < 0) {
        return NextResponse.json({ error: `${key} must be a non-negative number` }, { status: 400 });
      }
    }
    if (!(fields.firstNoticeDays < fields.secondNoticeDays && fields.secondNoticeDays < fields.finalNoticeDays && fields.finalNoticeDays < fields.suspendDays)) {
      return NextResponse.json({ error: "Stages must be in increasing order: first < second < final < suspend" }, { status: 400 });
    }

    const session = getSessionInfo(req);
    const settings = await saveEnforcementSettings({
      autoSuspendEnabled,
      firstNoticeDays: Math.round(fields.firstNoticeDays),
      secondNoticeDays: Math.round(fields.secondNoticeDays),
      finalNoticeDays: Math.round(fields.finalNoticeDays),
      suspendDays: Math.round(fields.suspendDays),
      lateFeeCents: Math.round(fields.lateFeeCents),
      updatedBy: session?.staffId ?? (session?.isOwner ? "owner" : null),
    });
    return NextResponse.json(settings);
  } catch (err) {
    console.error("BILLING_ENFORCEMENT_CONFIG_ERR:", err);
    return NextResponse.json({ error: "Failed to save settings" }, { status: 500 });
  }
}

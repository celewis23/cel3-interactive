import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/permissions";
import { getLeadGeneratorSettings, updateLeadGeneratorSettings } from "@/lib/leads/service";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const authErr = await requirePermission(req, "leads", "view");
  if (authErr) return authErr;

  const settings = await getLeadGeneratorSettings();
  return NextResponse.json({ settings });
}

export async function PATCH(req: NextRequest) {
  const authErr = await requirePermission(req, "leads", "edit");
  if (authErr) return authErr;

  try {
    const body = await req.json();
    const settings = await updateLeadGeneratorSettings(body);
    return NextResponse.json({ settings });
  } catch (err) {
    console.error("LEAD_GENERATOR_SETTINGS_PATCH_ERR:", err);
    return NextResponse.json({ error: "Failed to update lead generator settings" }, { status: 500 });
  }
}

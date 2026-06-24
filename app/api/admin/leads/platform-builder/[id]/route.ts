import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/permissions";
import { PlatformBuilderValidationError, updatePlatformBuilderLeadStatus } from "@/lib/platformBuilder/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authErr = await requirePermission(req, "leads", "edit");
  if (authErr) return authErr;

  try {
    const { id } = await params;
    const body = await req.json();
    await updatePlatformBuilderLeadStatus(id, body.status);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof PlatformBuilderValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error("PLATFORM_BUILDER_ADMIN_STATUS_ERR:", err);
    return NextResponse.json({ error: "Failed to update lead status" }, { status: 500 });
  }
}

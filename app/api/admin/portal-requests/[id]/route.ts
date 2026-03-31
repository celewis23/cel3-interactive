import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/permissions";
import { sanityWriteClient } from "@/lib/sanity.write";

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
    const patch: Record<string, unknown> = {
      updatedAt: new Date().toISOString(),
    };
    if ("status" in body) patch.status = body.status ?? "submitted";
    if ("adminNotes" in body) patch.adminNotes = body.adminNotes ?? null;
    const updated = await sanityWriteClient.patch(id).set(patch).commit();
    return NextResponse.json(updated);
  } catch (err) {
    console.error("ADMIN_PORTAL_REQUEST_PATCH_ERR:", err);
    return NextResponse.json({ error: "Failed to update request" }, { status: 500 });
  }
}

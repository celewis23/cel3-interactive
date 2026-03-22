export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/permissions";
import { removeCustomerDriveLink } from "@/lib/stripe/customerDriveLinks";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; folderId: string }> }
) {
  const authErr = await requirePermission(req, "billing", "edit");
  if (authErr) return authErr;

  try {
    const { id, folderId } = await params;
    await removeCustomerDriveLink(id, folderId);
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    console.error("DRIVE_LINKS_REMOVE_ERROR:", err);
    return NextResponse.json({ error: "Failed to remove drive link" }, { status: 500 });
  }
}

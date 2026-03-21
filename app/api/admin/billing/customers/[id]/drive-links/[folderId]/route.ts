export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken, COOKIE_NAME } from "@/lib/admin/auth";
import { removeCustomerDriveLink } from "@/lib/stripe/customerDriveLinks";

function requireAuth(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return false;
  return verifySessionToken(token)?.step === "full";
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; folderId: string }> }
) {
  if (!requireAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id, folderId } = await params;
    await removeCustomerDriveLink(id, folderId);
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    console.error("DRIVE_LINKS_REMOVE_ERROR:", err);
    return NextResponse.json({ error: "Failed to remove drive link" }, { status: 500 });
  }
}

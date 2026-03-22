export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/permissions";
import { getCustomerDriveLinks, addCustomerDriveLink } from "@/lib/stripe/customerDriveLinks";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authErr = await requirePermission(req, "billing", "view");
  if (authErr) return authErr;

  try {
    const { id } = await params;
    const links = await getCustomerDriveLinks(id);
    return NextResponse.json(links);
  } catch (err) {
    console.error("DRIVE_LINKS_GET_ERROR:", err);
    return NextResponse.json({ error: "Failed to get drive links" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authErr = await requirePermission(req, "billing", "edit");
  if (authErr) return authErr;

  try {
    const { id } = await params;
    const body = await req.json();
    const { folderId, folderName } = body;
    if (!folderId || !folderName) {
      return NextResponse.json({ error: "folderId and folderName are required" }, { status: 400 });
    }
    const link = await addCustomerDriveLink(id, folderId, folderName);
    return NextResponse.json(link, { status: 201 });
  } catch (err) {
    console.error("DRIVE_LINKS_ADD_ERROR:", err);
    return NextResponse.json({ error: "Failed to add drive link" }, { status: 500 });
  }
}

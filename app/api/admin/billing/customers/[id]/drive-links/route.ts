export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken, COOKIE_NAME } from "@/lib/admin/auth";
import { getCustomerDriveLinks, addCustomerDriveLink } from "@/lib/stripe/customerDriveLinks";

function requireAuth(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return false;
  return verifySessionToken(token)?.step === "full";
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!requireAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
  if (!requireAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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

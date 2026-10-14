import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/permissions";
import { listMockups } from "@/lib/mockups/db";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const authErr = await requirePermission(req, "mockups", "view");
  if (authErr) return authErr;

  try {
    const mockups = await listMockups();
    return NextResponse.json(mockups);
  } catch (err) {
    console.error("ADMIN_MOCKUPS_GET_ERR:", err);
    return NextResponse.json({ error: "Failed to fetch mockups" }, { status: 500 });
  }
}

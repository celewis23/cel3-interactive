export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/permissions";
import { deleteMeeting } from "@/lib/google/meet";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authErr = await requirePermission(req, "meet", "edit");
  if (authErr) return authErr;

  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const calendarId = searchParams.get("calendarId") ?? "primary";

  try {
    await deleteMeeting(calendarId, id);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("MEET_DELETE_ERROR:", err);
    return NextResponse.json({ error: "Failed to delete meeting" }, { status: 500 });
  }
}

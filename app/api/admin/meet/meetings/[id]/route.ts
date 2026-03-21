export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken, COOKIE_NAME } from "@/lib/admin/auth";
import { deleteMeeting } from "@/lib/google/meet";

function requireAuth(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return false;
  return verifySessionToken(token)?.step === "full";
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!requireAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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

export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken, COOKIE_NAME } from "@/lib/admin/auth";
import { removeMember } from "@/lib/google/chat";

function requireAuth(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return false;
  return verifySessionToken(token)?.step === "full";
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  if (!requireAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { name } = await params;
    const memberName = decodeURIComponent(name);
    await removeMember("", memberName);
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    console.error("CHAT_REMOVE_MEMBER_ERROR:", err);
    return NextResponse.json({ error: "Failed to remove member" }, { status: 500 });
  }
}

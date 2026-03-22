export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/permissions";
import { removeMember } from "@/lib/google/chat";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const authErr = await requirePermission(req, "chat", "edit");
  if (authErr) return authErr;

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

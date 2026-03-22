export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/permissions";
import { listMembers, addMember } from "@/lib/google/chat";

export async function GET(req: NextRequest) {
  const authErr = await requirePermission(req, "chat", "view");
  if (authErr) return authErr;

  const { searchParams } = new URL(req.url);
  const spaceName = searchParams.get("spaceName") ?? "";
  if (!spaceName) {
    return NextResponse.json({ error: "spaceName is required" }, { status: 400 });
  }

  try {
    const members = await listMembers(spaceName);
    return NextResponse.json(members);
  } catch (err) {
    console.error("CHAT_LIST_MEMBERS_ERROR:", err);
    return NextResponse.json({ error: "Failed to list members" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const authErr = await requirePermission(req, "chat", "edit");
  if (authErr) return authErr;

  try {
    const body = await req.json();
    const { spaceName, email } = body;
    if (!spaceName || !email) {
      return NextResponse.json({ error: "spaceName and email are required" }, { status: 400 });
    }
    await addMember(spaceName, email);
    return new NextResponse(null, { status: 201 });
  } catch (err) {
    console.error("CHAT_ADD_MEMBER_ERROR:", err);
    return NextResponse.json({ error: "Failed to add member" }, { status: 500 });
  }
}

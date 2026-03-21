export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken, COOKIE_NAME } from "@/lib/admin/auth";
import { listMembers, addMember } from "@/lib/google/chat";

function requireAuth(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return false;
  return verifySessionToken(token)?.step === "full";
}

export async function GET(req: NextRequest) {
  if (!requireAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
  if (!requireAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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

export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken, COOKIE_NAME } from "@/lib/admin/auth";
import { listSpaces, createSpace } from "@/lib/google/chat";

function requireAuth(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return false;
  return verifySessionToken(token)?.step === "full";
}

export async function GET(req: NextRequest) {
  if (!requireAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const spaces = await listSpaces();
    return NextResponse.json(spaces);
  } catch (err) {
    console.error("CHAT_SPACES_ERROR:", err);
    return NextResponse.json({ error: "Failed to list spaces" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!requireAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { displayName, spaceType, description } = body;
    if (!displayName || !spaceType) {
      return NextResponse.json({ error: "displayName and spaceType are required" }, { status: 400 });
    }
    const space = await createSpace({ displayName, spaceType, description });
    return NextResponse.json(space, { status: 201 });
  } catch (err) {
    console.error("CHAT_CREATE_SPACE_ERROR:", err);
    return NextResponse.json({ error: "Failed to create space" }, { status: 500 });
  }
}

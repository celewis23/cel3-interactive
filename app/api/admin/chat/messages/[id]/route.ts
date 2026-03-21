export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken, COOKIE_NAME } from "@/lib/admin/auth";
import { deleteMessage, updateMessage } from "@/lib/google/chat";

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

  try {
    const { id } = await params;
    const messageName = decodeURIComponent(id);
    await deleteMessage(messageName);
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    console.error("CHAT_DELETE_MESSAGE_ERROR:", err);
    return NextResponse.json({ error: "Failed to delete message" }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!requireAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;
    const messageName = decodeURIComponent(id);
    const body = await req.json();
    const { text } = body;
    if (!text) {
      return NextResponse.json({ error: "text is required" }, { status: 400 });
    }
    const message = await updateMessage(messageName, text);
    return NextResponse.json(message);
  } catch (err) {
    console.error("CHAT_UPDATE_MESSAGE_ERROR:", err);
    return NextResponse.json({ error: "Failed to update message" }, { status: 500 });
  }
}

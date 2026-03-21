export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken, COOKIE_NAME } from "@/lib/admin/auth";
import { listMessages, sendMessage } from "@/lib/google/chat";

function requireAuth(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return false;
  return verifySessionToken(token)?.step === "full";
}

export async function GET(req: NextRequest) {
  if (!requireAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const spaceName = searchParams.get("spaceName") ?? "";
  const pageToken = searchParams.get("pageToken") ?? undefined;

  if (!spaceName) {
    return NextResponse.json({ error: "spaceName is required" }, { status: 400 });
  }

  try {
    const result = await listMessages(spaceName, pageToken);
    return NextResponse.json(result);
  } catch (err) {
    console.error("CHAT_MESSAGES_ERROR:", err);
    return NextResponse.json({ error: "Failed to list messages" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!requireAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { spaceName, text } = body;
    if (!spaceName || !text) {
      return NextResponse.json({ error: "spaceName and text are required" }, { status: 400 });
    }
    const message = await sendMessage(spaceName, text);
    return NextResponse.json(message, { status: 201 });
  } catch (err) {
    console.error("CHAT_SEND_ERROR:", err);
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }
}

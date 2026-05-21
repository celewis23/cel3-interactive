export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getMessagingActor } from "@/lib/messaging/auth";
import { getUnreadCount } from "@/lib/messaging/service";

export async function GET(req: NextRequest) {
  try {
    const actor = await getMessagingActor(req);
    if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ count: await getUnreadCount(actor) });
  } catch (err) {
    console.error("MESSAGES_UNREAD_COUNT_GET_ERR:", err);
    return NextResponse.json({ error: "Failed to load unread count" }, { status: 500 });
  }
}

export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getMessagingActor } from "@/lib/messaging/auth";
import { listMessageablePortalUsers } from "@/lib/messaging/service";

export async function GET(req: NextRequest) {
  try {
    const actor = await getMessagingActor(req);
    if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (actor.kind !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const users = await listMessageablePortalUsers(actor, searchParams.get("q") ?? undefined);
    return NextResponse.json({ users });
  } catch (err) {
    console.error("MESSAGES_PORTAL_USERS_GET_ERR:", err);
    return NextResponse.json({ error: "Failed to load portal users" }, { status: 500 });
  }
}

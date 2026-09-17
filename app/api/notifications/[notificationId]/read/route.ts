import { withActivity } from "@/lib/audit/withActivity";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getMessagingActor } from "@/lib/messaging/auth";
import { markNotificationRead } from "@/lib/messaging/service";

async function handleActivityPOST(
  req: NextRequest,
  { params }: { params: Promise<{ notificationId: string }> }
) {
  const actor = await getMessagingActor(req);
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { notificationId } = await params;
  const result = await markNotificationRead(actor, notificationId);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ ok: true });
}


export const POST = withActivity("/api/notifications/[notificationId]/read", "POST", handleActivityPOST);

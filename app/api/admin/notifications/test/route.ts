import { withActivity } from "@/lib/audit/withActivity";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/permissions";
import { sendPushNotificationToAudience } from "@/lib/notifications/push";

async function handleActivityPOST(req: NextRequest) {
  const authErr = await requirePermission(req, "dashboard", "view");
  if (authErr) return authErr;

  try {
    const result = await sendPushNotificationToAudience({
      title: "Test notification",
      body: "Push notifications are working!",
      href: "/admin",
      tag: `test:${Date.now()}`,
    });
    return NextResponse.json(result);
  } catch (err) {
    console.error("PUSH_TEST_ERR:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export const POST = withActivity("/api/admin/notifications/test", "POST", handleActivityPOST);

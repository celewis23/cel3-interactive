import { withActivity } from "@/lib/audit/withActivity";
import { NextRequest, NextResponse } from "next/server";
import { COOKIE_NAME } from "@/lib/admin/auth";
import { logAudit, AuditAction } from "@/lib/audit/log";

export const runtime = "nodejs";

async function handleActivityPOST(req: NextRequest) {
  logAudit(req, {
    action: AuditAction.AUTH_LOGOUT,
    resourceType: "auth",
    description: "User logged out",
  });

  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, "", { maxAge: 0, path: "/" });
  return res;
}

export const POST = withActivity("/api/admin/auth/logout", "POST", handleActivityPOST);

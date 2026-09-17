import { withActivity } from "@/lib/audit/withActivity";
import { NextResponse } from "next/server";
import { PORTAL_COOKIE } from "@/lib/portal/auth";

export const runtime = "nodejs";

async function handleActivityPOST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(PORTAL_COOKIE, "", { maxAge: 0, path: "/" });
  return res;
}

export const POST = withActivity("/api/portal/auth/logout", "POST", handleActivityPOST);

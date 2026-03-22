import { NextRequest, NextResponse } from "next/server";
import { validatePin, verifySessionToken, createSessionToken, COOKIE_NAME } from "@/lib/admin/auth";
import { logAudit, AuditAction } from "@/lib/audit/log";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.json({ error: "No session" }, { status: 401 });
  }

  const session = verifySessionToken(token);
  if (!session || session.step !== "partial") {
    return NextResponse.json({ error: "Invalid session" }, { status: 401 });
  }

  const { pin } = await req.json();
  if (!validatePin(pin)) {
    return NextResponse.json({ error: "Invalid PIN" }, { status: 401 });
  }

  const newToken = createSessionToken("full");
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, newToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24,
  });

  logAudit(req, {
    action: AuditAction.AUTH_LOGIN,
    resourceType: "auth",
    description: "Owner logged in",
  }, { userId: null, userName: "Owner", userEmail: process.env.ADMIN_USERNAME ?? "owner", isOwner: true });

  return res;
}

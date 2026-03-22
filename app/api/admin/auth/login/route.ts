import { NextRequest, NextResponse } from "next/server";
import {
  validateCredentials,
  createSessionToken,
  createStaffSessionToken,
  COOKIE_NAME,
} from "@/lib/admin/auth";
import { sanityServer } from "@/lib/sanityServer";
import { verifyPassword } from "@/lib/admin/staffPassword";
import { logAudit, AuditAction } from "@/lib/audit/log";

export const runtime = "nodejs";

const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 24,
};

export async function POST(req: NextRequest) {
  const { username, password } = await req.json();

  // ── 1. Try owner credentials (username/password from env) ─────────────────
  if (validateCredentials(username, password)) {
    const token = createSessionToken("partial");
    const res = NextResponse.json({ ok: true, staffLogin: false });
    res.cookies.set(COOKIE_NAME, token, COOKIE_OPTS);
    return res;
  }

  // Track failed owner login attempt (username matches env username but wrong password)
  if (username === process.env.ADMIN_USERNAME) {
    logAudit(req, {
      action: AuditAction.AUTH_LOGIN_FAILED,
      resourceType: "auth",
      description: `Failed owner login attempt for ${username}`,
    }, { userId: null, userName: "Unknown", userEmail: username, isOwner: false });
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  // ── 2. Try staff login (email as username) ───────────────────────────────
  const email = username.toLowerCase().trim();
  if (!email.includes("@")) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const staff = await sanityServer.fetch<{
    _id: string;
    status: string;
    roleSlug: string;
    passwordHash: string | null;
    passwordSalt: string | null;
  } | null>(
    `*[_type == "staffMember" && email == $email][0]{
      _id, status, roleSlug, passwordHash, passwordSalt
    }`,
    { email }
  );

  if (
    !staff ||
    staff.status !== "active" ||
    !staff.passwordHash ||
    !staff.passwordSalt
  ) {
    logAudit(req, {
      action: AuditAction.AUTH_LOGIN_FAILED,
      resourceType: "auth",
      description: `Failed login attempt for ${email}`,
    }, { userId: null, userName: "Unknown", userEmail: email, isOwner: false });
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  if (!verifyPassword(password, staff.passwordHash, staff.passwordSalt)) {
    logAudit(req, {
      action: AuditAction.AUTH_LOGIN_FAILED,
      resourceType: "auth",
      description: `Failed login attempt for ${email} (wrong password)`,
    }, { userId: staff._id, userName: "Unknown", userEmail: email, isOwner: false });
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  // Update lastActiveAt
  try {
    const { sanityWriteClient } = await import("@/lib/sanity.write");
    await sanityWriteClient.patch(staff._id).set({ lastActiveAt: new Date().toISOString() }).commit();
  } catch { /* non-critical */ }

  const token = createStaffSessionToken(staff._id, staff.roleSlug);
  const res = NextResponse.json({ ok: true, staffLogin: true });
  res.cookies.set(COOKIE_NAME, token, COOKIE_OPTS);

  logAudit(req, {
    action: AuditAction.AUTH_LOGIN,
    resourceType: "auth",
    resourceId: staff._id,
    description: `Staff member logged in`,
  }, { userId: staff._id, userName: "Staff", userEmail: email, isOwner: false });

  return res;
}

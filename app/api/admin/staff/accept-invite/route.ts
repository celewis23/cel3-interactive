import { NextRequest, NextResponse } from "next/server";
import { sanityServer } from "@/lib/sanityServer";
import { sanityWriteClient } from "@/lib/sanity.write";
import { hashPassword } from "@/lib/admin/staffPassword";
import { createStaffSessionToken, COOKIE_NAME } from "@/lib/admin/auth";
import { logAudit, AuditAction } from "@/lib/audit/log";

export const runtime = "nodejs";

/** GET /api/admin/staff/accept-invite?token=xxx — validate an invite token */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) return NextResponse.json({ error: "Missing token" }, { status: 400 });

  const member = await sanityServer.fetch<{
    _id: string;
    name: string;
    email: string;
    roleSlug: string;
    status: string;
    inviteExpiry: string | null;
  } | null>(
    `*[_type == "staffMember" && inviteToken == $token][0]{
      _id, name, email, roleSlug, status, inviteExpiry
    }`,
    { token }
  );

  if (!member) return NextResponse.json({ error: "Invalid or expired invite" }, { status: 404 });
  if (member.status === "active") return NextResponse.json({ error: "Invite already accepted" }, { status: 409 });
  if (member.inviteExpiry && new Date(member.inviteExpiry) < new Date()) {
    return NextResponse.json({ error: "Invite has expired" }, { status: 410 });
  }

  const role = await sanityServer.fetch<{ name: string } | null>(
    `*[_type == "staffRole" && slug == $slug][0]{ name }`,
    { slug: member.roleSlug }
  );

  return NextResponse.json({
    name: member.name,
    email: member.email,
    roleName: role?.name ?? member.roleSlug,
  });
}

/** POST /api/admin/staff/accept-invite — complete invite acceptance with password */
export async function POST(req: NextRequest) {
  const { token, password } = await req.json();

  if (!token || !password) {
    return NextResponse.json({ error: "token and password are required" }, { status: 400 });
  }

  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }

  const member = await sanityServer.fetch<{
    _id: string;
    name: string;
    email: string;
    roleSlug: string;
    status: string;
    inviteExpiry: string | null;
  } | null>(
    `*[_type == "staffMember" && inviteToken == $token][0]{
      _id, name, email, roleSlug, status, inviteExpiry
    }`,
    { token }
  );

  if (!member) return NextResponse.json({ error: "Invalid or expired invite" }, { status: 404 });
  if (member.status === "active") return NextResponse.json({ error: "Invite already accepted" }, { status: 409 });
  if (member.inviteExpiry && new Date(member.inviteExpiry) < new Date()) {
    return NextResponse.json({ error: "Invite has expired" }, { status: 410 });
  }

  const { hash, salt } = hashPassword(password);
  const now = new Date().toISOString();

  await sanityWriteClient.patch(member._id).set({
    passwordHash: hash,
    passwordSalt: salt,
    status: "active",
    inviteToken: null,
    inviteExpiry: null,
    inviteAcceptedAt: now,
    lastActiveAt: now,
  }).commit();

  logAudit(req, {
    action: AuditAction.STAFF_ACTIVATED,
    resourceType: "staffMember",
    description: "Staff member activated via invite",
  }, { userId: member._id, userName: member.name, userEmail: member.email, isOwner: false });

  // Auto-login after accept
  const sessionToken = createStaffSessionToken(member._id, member.roleSlug);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24,
  });
  return res;
}

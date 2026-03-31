import { NextRequest, NextResponse } from "next/server";
import { sanityServer } from "@/lib/sanityServer";
import { sanityWriteClient } from "@/lib/sanity.write";
import { hashPassword, verifyPassword } from "@/lib/admin/staffPassword";
import { verifyPortalSessionToken, PORTAL_COOKIE } from "@/lib/portal/auth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const token = req.cookies.get(PORTAL_COOKIE)?.value;
  const session = token ? verifyPortalSessionToken(token) : null;
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { currentPassword, newPassword } = await req.json();
    const nextPassword = typeof newPassword === "string" ? newPassword : "";

    if (nextPassword.length < 8) {
      return NextResponse.json({ error: "New password must be at least 8 characters" }, { status: 400 });
    }

    const user = await sanityServer.fetch<{
      _id: string;
      status: string;
      passwordHash: string | null;
      passwordSalt: string | null;
      mustChangePassword: boolean | null;
    } | null>(
      `*[_type == "clientPortalUser" && _id == $id][0]{
        _id, status, passwordHash, passwordSalt, mustChangePassword
      }`,
      { id: session.userId }
    );

    if (!user || user.status === "suspended" || !user.passwordHash || !user.passwordSalt) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!user.mustChangePassword) {
      const current = typeof currentPassword === "string" ? currentPassword : "";
      if (!current || !verifyPassword(current, user.passwordHash, user.passwordSalt)) {
        return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
      }
    }

    const { hash, salt } = hashPassword(nextPassword);
    await sanityWriteClient.patch(user._id).set({
      passwordHash: hash,
      passwordSalt: salt,
      mustChangePassword: false,
      status: "active",
      lastLoginAt: new Date().toISOString(),
    }).commit();

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("PORTAL_CHANGE_PASSWORD_ERR:", err);
    return NextResponse.json({ error: "Failed to change password" }, { status: 500 });
  }
}

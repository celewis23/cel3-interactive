import { NextRequest, NextResponse } from "next/server";
import { COOKIE_NAME, verifySessionToken } from "@/lib/admin/auth";
import { OWNER_CREDENTIALS_ID, verifyOwnerPassword } from "@/lib/admin/ownerPassword";
import { hashPassword, verifyPassword } from "@/lib/admin/staffPassword";
import { sanityServer } from "@/lib/sanityServer";
import { sanityWriteClient } from "@/lib/sanity.write";
import { withActivity } from "@/lib/audit/withActivity";
import { logAudit } from "@/lib/audit/log";

export const runtime = "nodejs";

async function changePassword(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  const session = token ? verifySessionToken(token) : null;
  if (!session || session.step !== "full") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const origin = req.headers.get("origin");
  if (origin && origin !== new URL(req.url).origin) {
    return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  }
  const body = await req.json().catch(() => null);
  const { currentPassword, newPassword } = body ?? {};
  if (typeof currentPassword !== "string" || typeof newPassword !== "string" ||
      !currentPassword || currentPassword.length > 1024 || newPassword.length < 12 || newPassword.length > 128) {
    return NextResponse.json({ error: "Enter your current password and a new password of 12–128 characters." }, { status: 400 });
  }
  if (currentPassword === newPassword) {
    return NextResponse.json({ error: "Choose a different new password." }, { status: 400 });
  }

  try {
    let valid = false;
    if (session.staffId) {
      const staff = await sanityServer.fetch<{
        status: string; passwordHash: string; passwordSalt: string;
      } | null>(`*[_type == "staffMember" && _id == $id][0]{ status, passwordHash, passwordSalt }`, { id: session.staffId });
      if (!staff || staff.status !== "active") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      valid = verifyPassword(currentPassword, staff.passwordHash, staff.passwordSalt);
    } else {
      valid = await verifyOwnerPassword(process.env.ADMIN_USERNAME ?? "", currentPassword);
    }
    if (!valid) return NextResponse.json({ error: "Current password is incorrect." }, { status: 400 });

    const { hash, salt } = hashPassword(newPassword);
    const fields = { passwordHash: hash, passwordSalt: salt, passwordChangedAt: new Date().toISOString() };
    if (session.staffId) {
      await sanityWriteClient.patch(session.staffId).set(fields).commit();
    } else {
      await sanityWriteClient.createOrReplace({ _id: OWNER_CREDENTIALS_ID, _type: "adminCredentials", ...fields });
    }
    logAudit(req, {
      action: "admin.password_changed", resourceType: "auth",
      resourceId: session.staffId ?? "owner", description: "Account password changed",
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Could not change your password. Please try again." }, { status: 500 });
  }
}

export const POST = withActivity("/api/admin/auth/password", "POST", changePassword);

import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/permissions";
import { sanityServer } from "@/lib/sanityServer";
import { sanityWriteClient } from "@/lib/sanity.write";
import { generateTemporaryPortalPassword } from "@/lib/portal/auth";
import { sendEmail } from "@/lib/gmail/api";
import { hashPassword } from "@/lib/admin/staffPassword";

export const runtime = "nodejs";

const ALLOWED = [
  "name", "company", "stripeCustomerId", "pipelineContactId", "driveRootFolderId", "status",
] as const;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authErr = await requirePermission(req, "clients", "view");
  if (authErr) return authErr;
  const { id } = await params;
  try {
    const user = await sanityServer.fetch(`*[_type == "clientPortalUser" && _id == $id][0]`, { id });
    if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(user);
  } catch (err) {
    console.error("ADMIN_PORTAL_USER_GET_ERR:", err);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authErr = await requirePermission(req, "clients", "edit");
  if (authErr) return authErr;
  const { id } = await params;
  try {
    const body = await req.json();
    const patch: Record<string, unknown> = {};
    for (const field of ALLOWED) {
      if (field in body) patch[field] = body[field] ?? null;
    }
    const updated = await sanityWriteClient.patch(id).set(patch).commit();
    return NextResponse.json(updated);
  } catch (err) {
    console.error("ADMIN_PORTAL_USER_PATCH_ERR:", err);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authErr = await requirePermission(req, "clients", "delete");
  if (authErr) return authErr;
  const { id } = await params;
  try {
    const tokens = await sanityServer.fetch<{ _id: string }[]>(
      `*[_type == "clientPortalToken" && userId == $id]{ _id }`,
      { id }
    );
    for (const t of tokens) await sanityWriteClient.delete(t._id);
    await sanityWriteClient.delete(id);
    return NextResponse.json({ deleted: true });
  } catch (err) {
    console.error("ADMIN_PORTAL_USER_DELETE_ERR:", err);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}

// Send or resend invitation email with temporary credentials
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authErr = await requirePermission(req, "clients", "edit");
  if (authErr) return authErr;
  const { id } = await params;
  try {
    const user = await sanityServer.fetch<{ email: string; name: string | null; status: string | null } | null>(
      `*[_type == "clientPortalUser" && _id == $id][0]{ email, name, status }`,
      { id }
    );
    if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (user.status === "suspended") {
      return NextResponse.json({ error: "Restore this portal user before sending an invitation" }, { status: 409 });
    }

    const temporaryPassword = generateTemporaryPortalPassword();
    const { hash, salt } = hashPassword(temporaryPassword);
    const portalLoginUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? new URL(req.url).origin}/portal/auth/login`;
    const invitationSentAt = new Date().toISOString();

    await sanityWriteClient.patch(id).set({
      passwordHash: hash,
      passwordSalt: salt,
      mustChangePassword: true,
      invitationSentAt,
      status: "invited",
    }).commit();

    let emailSent = false;
    try {
      await sendEmail({
        to: user.email,
        subject: "Your CEL3 Interactive Client Portal Login",
        htmlBody: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;">
            <p style="font-size:13px;color:#888;margin:0 0 6px;text-transform:uppercase;letter-spacing:0.08em">CEL3 Interactive</p>
            <h1 style="font-size:22px;font-weight:700;color:#000;margin:0 0 16px;line-height:1.3">Your client portal is ready</h1>
            <p style="font-size:15px;color:#444;margin:0 0 28px;line-height:1.6">
              ${user.name ? `Hi ${user.name},` : "Hi,"} your CEL3 Interactive client portal is ready. Use the login details below to sign in.
            </p>
            <div style="background:#f5f5f5;border-radius:12px;padding:18px 20px;margin:0 0 24px;">
              <p style="font-size:13px;color:#666;margin:0 0 8px;">Login email</p>
              <p style="font-size:15px;color:#111;margin:0 0 14px;font-weight:600;">${user.email}</p>
              <p style="font-size:13px;color:#666;margin:0 0 8px;">Temporary password</p>
              <p style="font-size:15px;color:#111;margin:0;font-weight:600;letter-spacing:0.02em;">${temporaryPassword}</p>
            </div>
            <a href="${portalLoginUrl}" style="display:inline-block;padding:13px 28px;background:#0ea5e9;color:#fff;text-decoration:none;border-radius:10px;font-weight:600;font-size:15px;">
              Go to portal login
            </a>
            <p style="font-size:13px;color:#aaa;margin:24px 0 0;line-height:1.6">
              For security, you&apos;ll be asked to change this password the first time you sign in.
            </p>
          </div>
        `,
      });
      emailSent = true;
    } catch (emailErr) {
      console.error("PORTAL_RESEND_EMAIL_ERR:", emailErr);
    }

    return NextResponse.json({
      ok: true,
      emailSent,
      loginUrl: portalLoginUrl,
      loginEmail: user.email,
      temporaryPassword,
      invitationSentAt,
    });
  } catch (err) {
    console.error("ADMIN_PORTAL_USER_RESEND_ERR:", err);
    return NextResponse.json({ error: "Failed to send portal invitation" }, { status: 500 });
  }
}

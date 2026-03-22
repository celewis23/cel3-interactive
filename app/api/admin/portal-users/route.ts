import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/permissions";
import { sanityServer } from "@/lib/sanityServer";
import { sanityWriteClient } from "@/lib/sanity.write";
import { generateMagicToken } from "@/lib/portal/auth";
import { sendEmail } from "@/lib/gmail/api";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const authErr = await requirePermission(req, "clients", "view");
  if (authErr) return authErr;

  try {
    const users = await sanityServer.fetch(
      `*[_type == "clientPortalUser"] | order(_createdAt desc) {
        _id, email, name, company, stripeCustomerId, pipelineContactId,
        driveRootFolderId, status, lastLoginAt, _createdAt
      }`
    );
    return NextResponse.json(users);
  } catch (err) {
    console.error("ADMIN_PORTAL_USERS_GET_ERR:", err);
    return NextResponse.json({ error: "Failed to fetch portal users" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const authErr = await requirePermission(req, "clients", "edit");
  if (authErr) return authErr;

  try {
    const body = await req.json();
    if (!body.email?.trim()) {
      return NextResponse.json({ error: "email is required" }, { status: 400 });
    }

    const email = body.email.trim().toLowerCase();

    const existing = await sanityServer.fetch(
      `*[_type == "clientPortalUser" && email == $email][0]{ _id }`,
      { email }
    );
    if (existing) {
      return NextResponse.json(
        { error: "A portal user with this email already exists" },
        { status: 409 }
      );
    }

    const user = await sanityWriteClient.create({
      _type: "clientPortalUser",
      email,
      name: body.name?.trim() || null,
      company: body.company?.trim() || null,
      stripeCustomerId: body.stripeCustomerId || null,
      pipelineContactId: body.pipelineContactId || null,
      driveRootFolderId: body.driveRootFolderId || null,
      status: "invited",
      createdAt: new Date().toISOString(),
      lastLoginAt: null,
    });

    const token = generateMagicToken();
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
    await sanityWriteClient.create({
      _type: "clientPortalToken",
      email,
      userId: user._id,
      token,
      expiresAt,
      used: false,
    });

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(req.url).origin;
    const inviteLink = `${siteUrl}/portal/auth/verify?token=${token}`;

    let emailSent = false;
    try {
      await sendEmail({
        to: email,
        subject: "You've been invited to the CEL3 Interactive Client Portal",
        htmlBody: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;">
            <p style="font-size:13px;color:#888;margin:0 0 6px;text-transform:uppercase;letter-spacing:0.08em">CEL3 Interactive</p>
            <h1 style="font-size:22px;font-weight:700;color:#000;margin:0 0 16px;line-height:1.3">Welcome to your client portal</h1>
            <p style="font-size:15px;color:#444;margin:0 0 28px;line-height:1.6">
              ${body.name ? `Hi ${body.name}, y` : "Y"}ou&apos;ve been set up with access to your dedicated client portal — view invoices, project progress, files, estimates, and upcoming appointments all in one place.
            </p>
            <a href="${inviteLink}" style="display:inline-block;padding:13px 28px;background:#0ea5e9;color:#fff;text-decoration:none;border-radius:10px;font-weight:600;font-size:15px;">
              Access your portal
            </a>
            <p style="font-size:13px;color:#aaa;margin:28px 0 0;line-height:1.6">
              This invitation link expires in 48 hours. After that, you can request a new sign-in link from the portal login page.
            </p>
          </div>
        `,
      });
      emailSent = true;
    } catch (emailErr) {
      console.error("PORTAL_INVITE_EMAIL_ERR:", emailErr);
    }

    return NextResponse.json({ ...user, emailSent, inviteLink }, { status: 201 });
  } catch (err) {
    console.error("ADMIN_PORTAL_USERS_POST_ERR:", err);
    return NextResponse.json({ error: "Failed to create portal user" }, { status: 500 });
  }
}

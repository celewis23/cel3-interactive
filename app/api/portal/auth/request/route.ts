import { NextRequest, NextResponse } from "next/server";
import { sanityServer } from "@/lib/sanityServer";
import { sanityWriteClient } from "@/lib/sanity.write";
import { generateMagicToken } from "@/lib/portal/auth";
import { sendEmail } from "@/lib/gmail/api";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email?.trim()) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }
    const normalizedEmail = email.trim().toLowerCase();

    const user = await sanityServer.fetch<{ _id: string; name: string | null } | null>(
      `*[_type == "clientPortalUser" && email == $email && status != "suspended"][0]{ _id, name }`,
      { email: normalizedEmail }
    );

    // Always return success to avoid email enumeration
    if (!user) {
      return NextResponse.json({ ok: true });
    }

    const token = generateMagicToken();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    await sanityWriteClient.create({
      _type: "clientPortalToken",
      email: normalizedEmail,
      userId: user._id,
      token,
      expiresAt,
      used: false,
    });

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(req.url).origin;
    const link = `${siteUrl}/portal/auth/verify?token=${token}`;

    try {
      await sendEmail({
        to: normalizedEmail,
        subject: "Your CEL3 Interactive Portal Sign-In Link",
        htmlBody: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;">
            <p style="font-size:13px;color:#888;margin:0 0 6px;text-transform:uppercase;letter-spacing:0.08em">CEL3 Interactive</p>
            <h1 style="font-size:22px;font-weight:700;color:#000;margin:0 0 16px;line-height:1.3">Sign in to your client portal</h1>
            <p style="font-size:15px;color:#444;margin:0 0 28px;line-height:1.6">
              Click the button below to sign in. This link is valid for 15 minutes and can only be used once.
            </p>
            <a href="${link}" style="display:inline-block;padding:13px 28px;background:#0ea5e9;color:#fff;text-decoration:none;border-radius:10px;font-weight:600;font-size:15px;">
              Sign in to portal
            </a>
            <p style="font-size:13px;color:#aaa;margin:28px 0 0;line-height:1.6">
              If you didn&apos;t request this email, you can safely ignore it.
            </p>
          </div>
        `,
      });
    } catch (emailErr) {
      console.error("PORTAL_MAGIC_LINK_EMAIL_ERR:", emailErr);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("PORTAL_AUTH_REQUEST_ERR:", err);
    return NextResponse.json({ error: "Failed to process request" }, { status: 500 });
  }
}

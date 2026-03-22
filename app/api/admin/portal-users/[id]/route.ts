import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken, COOKIE_NAME } from "@/lib/admin/auth";
import { sanityServer } from "@/lib/sanityServer";
import { sanityWriteClient } from "@/lib/sanity.write";
import { generateMagicToken } from "@/lib/portal/auth";
import { sendEmail } from "@/lib/gmail/api";

export const runtime = "nodejs";

function requireAuth(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return false;
  return verifySessionToken(token)?.step === "full";
}

const ALLOWED = [
  "name", "company", "stripeCustomerId", "pipelineContactId", "driveRootFolderId", "status",
] as const;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!requireAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
  if (!requireAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
  if (!requireAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

// Resend invite
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!requireAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  try {
    const user = await sanityServer.fetch<{ email: string; name: string | null } | null>(
      `*[_type == "clientPortalUser" && _id == $id][0]{ email, name }`,
      { id }
    );
    if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const token = generateMagicToken();
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
    await sanityWriteClient.create({
      _type: "clientPortalToken",
      email: user.email,
      userId: id,
      token,
      expiresAt,
      used: false,
    });

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(req.url).origin;
    const inviteLink = `${siteUrl}/portal/auth/verify?token=${token}`;

    let emailSent = false;
    try {
      await sendEmail({
        to: user.email,
        subject: "Your CEL3 Interactive Portal Sign-In Link",
        htmlBody: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;">
            <p style="font-size:13px;color:#888;margin:0 0 6px;text-transform:uppercase;letter-spacing:0.08em">CEL3 Interactive</p>
            <h1 style="font-size:22px;font-weight:700;color:#000;margin:0 0 16px;line-height:1.3">Sign in to your client portal</h1>
            <p style="font-size:15px;color:#444;margin:0 0 28px;line-height:1.6">
              Click the button below to sign in. This link expires in 48 hours.
            </p>
            <a href="${inviteLink}" style="display:inline-block;padding:13px 28px;background:#0ea5e9;color:#fff;text-decoration:none;border-radius:10px;font-weight:600;font-size:15px;">
              Access your portal
            </a>
          </div>
        `,
      });
      emailSent = true;
    } catch (emailErr) {
      console.error("PORTAL_RESEND_EMAIL_ERR:", emailErr);
    }

    return NextResponse.json({ ok: true, emailSent, inviteLink });
  } catch (err) {
    console.error("ADMIN_PORTAL_USER_RESEND_ERR:", err);
    return NextResponse.json({ error: "Failed to resend invite" }, { status: 500 });
  }
}

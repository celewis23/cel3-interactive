import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/permissions";
import { sanityServer } from "@/lib/sanityServer";
import { sanityWriteClient } from "@/lib/sanity.write";
import { randomBytes } from "crypto";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const authErr = await requirePermission(req, "staffManagement", "view");
  if (authErr) return authErr;

  const members = await sanityServer.fetch(
    `*[_type == "staffMember"] | order(joinedAt desc){
      _id, name, email, roleSlug, status,
      inviteToken, inviteExpiry, inviteAcceptedAt,
      joinedAt, lastActiveAt
    }`
  );
  return NextResponse.json(members);
}

export async function POST(req: NextRequest) {
  const authErr = await requirePermission(req, "staffManagement", "edit");
  if (authErr) return authErr;

  const { name, email, roleSlug } = await req.json();

  if (!name?.trim() || !email?.trim() || !roleSlug?.trim()) {
    return NextResponse.json(
      { error: "name, email, and roleSlug are required" },
      { status: 400 }
    );
  }

  const normalized = email.toLowerCase().trim();

  // Check duplicate
  const existing = await sanityServer.fetch<string | null>(
    `*[_type == "staffMember" && email == $email][0]._id`,
    { email: normalized }
  );
  if (existing) {
    return NextResponse.json({ error: "A staff member with this email already exists" }, { status: 409 });
  }

  // Verify role exists
  const role = await sanityServer.fetch<{ name: string } | null>(
    `*[_type == "staffRole" && slug == $slug][0]{ name }`,
    { slug: roleSlug }
  );
  if (!role) {
    return NextResponse.json({ error: "Role not found" }, { status: 400 });
  }

  const inviteToken = randomBytes(32).toString("hex");
  const inviteExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const member = await sanityWriteClient.create({
    _type: "staffMember",
    name: name.trim(),
    email: normalized,
    roleSlug,
    status: "pending",
    passwordHash: null,
    passwordSalt: null,
    inviteToken,
    inviteExpiry,
    inviteAcceptedAt: null,
    joinedAt: new Date().toISOString(),
    lastActiveAt: null,
  });

  // Send invite email
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
    const inviteUrl = `${baseUrl}/admin/invite/${inviteToken}`;
    const { sendEmail } = await import("@/lib/gmail/api");
    await sendEmail({
      to: normalized,
      subject: `You've been invited to CEL3 Interactive Backoffice`,
      htmlBody: `
        <p>Hi ${name.trim()},</p>
        <p>You've been invited to join the CEL3 Interactive backoffice as <strong>${role.name}</strong>.</p>
        <p>Click the link below to set up your account:</p>
        <p><a href="${inviteUrl}">${inviteUrl}</a></p>
        <p>This link expires in 7 days.</p>
      `,
    });
  } catch (e) {
    console.error("STAFF_INVITE_EMAIL_ERR:", e);
    // Non-critical — member is created, invite URL can be shared manually
  }

  return NextResponse.json(member, { status: 201 });
}

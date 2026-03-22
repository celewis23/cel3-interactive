import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/permissions";
import { sanityServer } from "@/lib/sanityServer";
import { sanityWriteClient } from "@/lib/sanity.write";
import { randomBytes } from "crypto";

export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authErr = await requirePermission(req, "staffManagement", "edit");
  if (authErr) return authErr;

  const { id } = await params;
  const member = await sanityServer.fetch<{
    name: string;
    email: string;
    status: string;
    roleSlug: string;
  } | null>(
    `*[_type == "staffMember" && _id == $id][0]{ name, email, status, roleSlug }`,
    { id }
  );

  if (!member) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (member.status === "active") {
    return NextResponse.json({ error: "Member has already accepted the invite" }, { status: 409 });
  }

  const inviteToken = randomBytes(32).toString("hex");
  const inviteExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  await sanityWriteClient.patch(id).set({ inviteToken, inviteExpiry }).commit();

  const role = await sanityServer.fetch<{ name: string } | null>(
    `*[_type == "staffRole" && slug == $slug][0]{ name }`,
    { slug: member.roleSlug }
  );

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
  const inviteUrl = `${baseUrl}/admin/invite/${inviteToken}`;

  try {
    const { sendEmail } = await import("@/lib/gmail/api");
    await sendEmail({
      to: member.email,
      subject: `Your invite to CEL3 Interactive Backoffice`,
      htmlBody: `
        <p>Hi ${member.name},</p>
        <p>Here is your new invite link for the CEL3 Interactive backoffice (${role?.name ?? member.roleSlug}):</p>
        <p><a href="${inviteUrl}">${inviteUrl}</a></p>
        <p>This link expires in 7 days.</p>
      `,
    });
  } catch (e) {
    console.error("STAFF_RESEND_EMAIL_ERR:", e);
  }

  return NextResponse.json({ ok: true, inviteUrl });
}

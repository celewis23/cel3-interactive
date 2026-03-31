import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/permissions";
import { sanityServer } from "@/lib/sanityServer";
import { sanityWriteClient } from "@/lib/sanity.write";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const authErr = await requirePermission(req, "clients", "view");
  if (authErr) return authErr;

  try {
    const users = await sanityServer.fetch(
      `*[_type == "clientPortalUser"] | order(_createdAt desc) {
        _id, email, name, company, stripeCustomerId, pipelineContactId,
        driveRootFolderId, status, lastLoginAt, invitationSentAt, mustChangePassword, _createdAt
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
      passwordHash: null,
      passwordSalt: null,
      mustChangePassword: false,
      invitationSentAt: null,
      status: "ready",
      createdAt: new Date().toISOString(),
      lastLoginAt: null,
    });

    return NextResponse.json(user, { status: 201 });
  } catch (err) {
    console.error("ADMIN_PORTAL_USERS_POST_ERR:", err);
    return NextResponse.json({ error: "Failed to create portal user" }, { status: 500 });
  }
}

export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { COOKIE_NAME, verifySessionToken } from "@/lib/admin/auth";
import { sanityServer } from "@/lib/sanityServer";
import { sanityWriteClient } from "@/lib/sanity.write";
import { logAudit } from "@/lib/audit/log";

export async function GET(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  const session = token ? verifySessionToken(token) : null;
  if (!session || session.step !== "full") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!session.staffId) {
    const settings = await sanityServer.fetch<{
      ownerName?: string | null;
      ownerProfileImageUrl?: string | null;
    } | null>(`*[_id == "siteSettings"][0]{ ownerName, ownerProfileImageUrl }`);

    return NextResponse.json({
      isOwner: true,
      staffId: null,
      name: settings?.ownerName ?? "Owner",
      email: process.env.ADMIN_USERNAME ?? "owner",
      profileImageUrl: settings?.ownerProfileImageUrl ?? null,
    });
  }

  const staff = await sanityServer.fetch<{
    _id: string;
    name: string;
    email: string;
    status: string;
    profileImageUrl?: string | null;
  } | null>(
    `*[_type == "staffMember" && _id == $id][0]{ _id, name, email, status, profileImageUrl }`,
    { id: session.staffId }
  );

  if (!staff || staff.status !== "active") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    isOwner: false,
    staffId: staff._id,
    name: staff.name,
    email: staff.email,
    profileImageUrl: staff.profileImageUrl ?? null,
  });
}

export async function PATCH(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  const session = token ? verifySessionToken(token) : null;
  if (!session || session.step !== "full") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({})) as { name?: unknown };
  const name = String(body.name ?? "").replace(/\s+/g, " ").trim();
  if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });
  if (name.length > 80) return NextResponse.json({ error: "Name must be 80 characters or less" }, { status: 400 });

  if (!session.staffId) {
    const existing = await sanityServer.fetch<{ _id: string } | null>(`*[_id == "siteSettings"][0]{ _id }`);
    if (existing) {
      await sanityWriteClient.patch("siteSettings").set({ ownerName: name }).commit();
    } else {
      await sanityWriteClient.createOrReplace({
        _id: "siteSettings",
        _type: "siteSettings",
        ownerName: name,
      });
    }

    logAudit(req, {
      action: "admin.profile_updated",
      resourceType: "siteSettings",
      resourceId: "siteSettings",
      description: "Admin profile name updated",
    });

    return NextResponse.json({
      isOwner: true,
      staffId: null,
      name,
      email: process.env.ADMIN_USERNAME ?? "owner",
    });
  }

  const staff = await sanityServer.fetch<{ _id: string; email: string; status: string; profileImageUrl?: string | null } | null>(
    `*[_type == "staffMember" && _id == $id][0]{ _id, email, status, profileImageUrl }`,
    { id: session.staffId }
  );
  if (!staff || staff.status !== "active") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await sanityWriteClient.patch(staff._id).set({ name }).commit();

  logAudit(req, {
    action: "admin.profile_updated",
    resourceType: "staffMember",
    resourceId: staff._id,
    resourceLabel: name,
    description: "Admin profile name updated",
  });

  return NextResponse.json({
    isOwner: false,
    staffId: staff._id,
    name,
    email: staff.email,
    profileImageUrl: staff.profileImageUrl ?? null,
  });
}

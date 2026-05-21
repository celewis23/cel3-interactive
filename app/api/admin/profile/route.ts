export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { COOKIE_NAME, verifySessionToken } from "@/lib/admin/auth";
import { sanityServer } from "@/lib/sanityServer";

export async function GET(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  const session = token ? verifySessionToken(token) : null;
  if (!session || session.step !== "full") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!session.staffId) {
    const settings = await sanityServer.fetch<{
      ownerProfileImageUrl?: string | null;
    } | null>(`*[_id == "siteSettings"][0]{ ownerProfileImageUrl }`);

    return NextResponse.json({
      isOwner: true,
      staffId: null,
      name: "Owner",
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

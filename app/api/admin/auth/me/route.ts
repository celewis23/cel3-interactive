import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken, COOKIE_NAME } from "@/lib/admin/auth";
import { sanityServer } from "@/lib/sanityServer";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const session = verifySessionToken(token);
  if (!session || session.step !== "full") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Owner session (env-based credentials)
  if (!session.staffId) {
    return NextResponse.json({
      isOwner: true,
      staffId: null,
      name: "Owner",
      email: process.env.ADMIN_USERNAME ?? "owner",
      roleSlug: "owner",
      roleName: "Owner",
      permissions: null, // null = full access
    });
  }

  // Staff session — fetch member + role
  const staff = await sanityServer.fetch<{
    _id: string;
    name: string;
    email: string;
    status: string;
    roleSlug: string;
  } | null>(
    `*[_type == "staffMember" && _id == $id][0]{ _id, name, email, status, roleSlug }`,
    { id: session.staffId }
  );

  if (!staff || staff.status !== "active") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = await sanityServer.fetch<{
    name: string;
    permissions: Record<string, Record<string, boolean>>;
  } | null>(
    `*[_type == "staffRole" && slug == $slug][0]{ name, permissions }`,
    { slug: staff.roleSlug }
  );

  return NextResponse.json({
    isOwner: false,
    staffId: staff._id,
    name: staff.name,
    email: staff.email,
    roleSlug: staff.roleSlug,
    roleName: role?.name ?? staff.roleSlug,
    permissions: role?.permissions ?? null,
  });
}

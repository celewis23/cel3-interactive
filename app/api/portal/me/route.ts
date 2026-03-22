import { NextRequest, NextResponse } from "next/server";
import { sanityServer } from "@/lib/sanityServer";
import { verifyPortalSessionToken, PORTAL_COOKIE } from "@/lib/portal/auth";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const token = req.cookies.get(PORTAL_COOKIE)?.value;
  const session = token ? verifyPortalSessionToken(token) : null;
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const user = await sanityServer.fetch(
      `*[_type == "clientPortalUser" && _id == $id][0]{
        _id, email, name, company, stripeCustomerId, pipelineContactId, driveRootFolderId, status, createdAt
      }`,
      { id: session.userId }
    );
    if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(user);
  } catch (err) {
    console.error("PORTAL_ME_ERR:", err);
    return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 });
  }
}

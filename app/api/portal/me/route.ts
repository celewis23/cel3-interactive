import { NextRequest, NextResponse } from "next/server";
import { verifyPortalSessionToken, PORTAL_COOKIE } from "@/lib/portal/auth";
import { getPortalProfile, updatePortalProfile } from "@/lib/portal/profile";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const token = req.cookies.get(PORTAL_COOKIE)?.value;
  const session = token ? verifyPortalSessionToken(token) : null;
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const profile = await getPortalProfile(session.userId);
    if (!profile) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(profile);
  } catch (err) {
    console.error("PORTAL_ME_ERR:", err);
    return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const token = req.cookies.get(PORTAL_COOKIE)?.value;
  const session = token ? verifyPortalSessionToken(token) : null;
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const profile = await updatePortalProfile(session.userId, {
      displayName: typeof body.displayName === "string" ? body.displayName : "",
      email: typeof body.email === "string" ? body.email : "",
      phone: typeof body.phone === "string" ? body.phone : null,
      addressLine1: typeof body.addressLine1 === "string" ? body.addressLine1 : null,
      addressCity: typeof body.addressCity === "string" ? body.addressCity : null,
      addressState: typeof body.addressState === "string" ? body.addressState : null,
      addressPostalCode: typeof body.addressPostalCode === "string" ? body.addressPostalCode : null,
      addressCountry: typeof body.addressCountry === "string" ? body.addressCountry : null,
    });
    return NextResponse.json(profile);
  } catch (err) {
    console.error("PORTAL_ME_PATCH_ERR:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed to update profile" }, { status: 500 });
  }
}

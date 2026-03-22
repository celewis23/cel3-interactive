import { NextRequest, NextResponse } from "next/server";
import { sanityServer } from "@/lib/sanityServer";
import { verifyPortalSessionToken, PORTAL_COOKIE } from "@/lib/portal/auth";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const token = req.cookies.get(PORTAL_COOKIE)?.value;
  const session = token ? verifyPortalSessionToken(token) : null;
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const user = await sanityServer.fetch<{
      stripeCustomerId: string | null;
      pipelineContactId: string | null;
      email: string;
    } | null>(
      `*[_type == "clientPortalUser" && _id == $id][0]{ stripeCustomerId, pipelineContactId, email }`,
      { id: session.userId }
    );
    if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const instances = await sanityServer.fetch(
      `*[_type == "onboardingInstance" && status != "archived" && (
        (portalUserId != null && portalUserId == $userId) ||
        (stripeCustomerId != null && stripeCustomerId == $stripeId) ||
        (pipelineContactId != null && pipelineContactId == $contactId) ||
        clientEmail == $email
      )] | order(_createdAt desc) {
        _id, templateName, clientName, startDate, status, steps, _createdAt
      }`,
      {
        userId: session.userId,
        stripeId: user.stripeCustomerId ?? "__none__",
        contactId: user.pipelineContactId ?? "__none__",
        email: user.email,
      }
    );

    return NextResponse.json(instances);
  } catch (err) {
    console.error("PORTAL_ONBOARDING_ERR:", err);
    return NextResponse.json({ error: "Failed to fetch onboarding" }, { status: 500 });
  }
}

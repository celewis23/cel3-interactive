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

    const contracts = await sanityServer.fetch(
      `*[_type == "contract" && status != "draft" && (
        (portalUserId != null && portalUserId == $userId) ||
        (stripeCustomerId != null && stripeCustomerId == $stripeId) ||
        (pipelineContactId != null && pipelineContactId == $contactId) ||
        clientEmail == $email
      )] | order(_createdAt desc) {
        _id, number, date, expiryDate, status, clientName, clientCompany,
        templateName, category, signingToken, sentAt, viewedAt, signedAt,
        declinedAt, signerName, _createdAt
      }`,
      {
        userId: session.userId,
        stripeId: user.stripeCustomerId ?? "__none__",
        contactId: user.pipelineContactId ?? "__none__",
        email: user.email,
      }
    );
    return NextResponse.json(contracts);
  } catch (err) {
    console.error("PORTAL_CONTRACTS_ERR:", err);
    return NextResponse.json({ error: "Failed to fetch contracts" }, { status: 500 });
  }
}

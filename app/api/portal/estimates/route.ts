import { NextRequest, NextResponse } from "next/server";
import { sanityServer } from "@/lib/sanityServer";
import { verifyPortalSessionToken, PORTAL_COOKIE } from "@/lib/portal/auth";
import { sanityWriteClient } from "@/lib/sanity.write";

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

    const estimates = await sanityServer.fetch(
      `*[_type == "estimate" && status != "draft" && (
        (stripeCustomerId != null && stripeCustomerId == $stripeId) ||
        (pipelineContactId != null && pipelineContactId == $contactId) ||
        clientEmail == $email
      )] | order(_createdAt desc) {
        _id, number, date, expiryDate, status, clientName, clientCompany,
        total, currency, approvalToken, sentAt, approvedAt, declinedAt, stripeInvoiceId,
        lineItems, subtotal, taxAmount, discountAmount, notes
      }`,
      {
        stripeId: user.stripeCustomerId ?? "__none__",
        contactId: user.pipelineContactId ?? "__none__",
        email: user.email,
      }
    );
    return NextResponse.json(estimates);
  } catch (err) {
    console.error("PORTAL_ESTIMATES_ERR:", err);
    return NextResponse.json({ error: "Failed to fetch estimates" }, { status: 500 });
  }
}

// Approve or decline an estimate
export async function POST(req: NextRequest) {
  const token = req.cookies.get(PORTAL_COOKIE)?.value;
  const session = token ? verifyPortalSessionToken(token) : null;
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { estimateId, action } = body;
    if (!estimateId || !["approve", "decline"].includes(action)) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const user = await sanityServer.fetch<{
      stripeCustomerId: string | null;
      pipelineContactId: string | null;
      email: string;
    } | null>(
      `*[_type == "clientPortalUser" && _id == $id][0]{ stripeCustomerId, pipelineContactId, email }`,
      { id: session.userId }
    );
    if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Verify ownership
    const estimate = await sanityServer.fetch<{
      _id: string;
      status: string;
      stripeCustomerId: string | null;
      pipelineContactId: string | null;
      clientEmail: string | null;
    } | null>(
      `*[_type == "estimate" && _id == $id][0]{
        _id, status, stripeCustomerId, pipelineContactId, clientEmail
      }`,
      { id: estimateId }
    );

    if (!estimate) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const owned =
      (user.stripeCustomerId && estimate.stripeCustomerId === user.stripeCustomerId) ||
      (user.pipelineContactId && estimate.pipelineContactId === user.pipelineContactId) ||
      estimate.clientEmail === user.email;

    if (!owned) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (!["sent", "viewed"].includes(estimate.status)) {
      return NextResponse.json({ error: "Estimate cannot be actioned in its current state" }, { status: 409 });
    }

    const now = new Date().toISOString();
    const patch =
      action === "approve"
        ? { status: "approved", approvedAt: now }
        : { status: "declined", declinedAt: now };

    const updated = await sanityWriteClient.patch(estimateId).set(patch).commit();
    return NextResponse.json(updated);
  } catch (err) {
    console.error("PORTAL_ESTIMATES_POST_ERR:", err);
    return NextResponse.json({ error: "Failed to update estimate" }, { status: 500 });
  }
}

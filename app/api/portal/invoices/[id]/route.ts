import { NextRequest, NextResponse } from "next/server";
import { sanityServer } from "@/lib/sanityServer";
import { verifyPortalSessionToken, PORTAL_COOKIE } from "@/lib/portal/auth";
import { getInvoice } from "@/lib/stripe/billing";
import { canAccessPortalInvoice, type PortalBillingAccess } from "@/lib/portal/billingAccess";

export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = req.cookies.get(PORTAL_COOKIE)?.value;
  const session = token ? verifyPortalSessionToken(token) : null;
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;
    const user = await sanityServer.fetch<PortalBillingAccess | null>(
      `*[_type == "clientPortalUser" && _id == $id && status != "suspended"][0]{ stripeCustomerId, managedStripeCustomerIds }`,
      { id: session.userId }
    );
    if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const invoice = await getInvoice(id);
    if (!invoice) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (!canAccessPortalInvoice(user, invoice)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json(invoice);
  } catch (err) {
    console.error("PORTAL_INVOICE_GET_ERR:", err);
    return NextResponse.json({ error: "Failed to fetch invoice" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { sanityServer } from "@/lib/sanityServer";
import { verifyPortalSessionToken, PORTAL_COOKIE } from "@/lib/portal/auth";
import { listPortalInvoices, type PortalBillingAccess } from "@/lib/portal/billingAccess";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const token = req.cookies.get(PORTAL_COOKIE)?.value;
  const session = token ? verifyPortalSessionToken(token) : null;
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const user = await sanityServer.fetch<PortalBillingAccess | null>(
      `*[_type == "clientPortalUser" && _id == $id && status != "suspended"][0]{ stripeCustomerId, managedStripeCustomerIds }`,
      { id: session.userId }
    );
    if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(await listPortalInvoices(user));
  } catch (err) {
    console.error("PORTAL_INVOICES_ERR:", err);
    return NextResponse.json({ error: "Failed to fetch invoices" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { sanityServer } from "@/lib/sanityServer";
import { verifyPortalSessionToken, PORTAL_COOKIE } from "@/lib/portal/auth";
import { listInvoices } from "@/lib/stripe/billing";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const token = req.cookies.get(PORTAL_COOKIE)?.value;
  const session = token ? verifyPortalSessionToken(token) : null;
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const user = await sanityServer.fetch<{ stripeCustomerId: string | null } | null>(
      `*[_type == "clientPortalUser" && _id == $id][0]{ stripeCustomerId }`,
      { id: session.userId }
    );
    if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (!user.stripeCustomerId) return NextResponse.json({ invoices: [] });

    const [paid, open] = await Promise.all([
      listInvoices({ customerId: user.stripeCustomerId, status: "paid", limit: 50 }),
      listInvoices({ customerId: user.stripeCustomerId, status: "open", limit: 50 }),
    ]);

    const invoices = [...open.invoices, ...paid.invoices].sort((a, b) => b.created - a.created);
    return NextResponse.json({ invoices });
  } catch (err) {
    console.error("PORTAL_INVOICES_ERR:", err);
    return NextResponse.json({ error: "Failed to fetch invoices" }, { status: 500 });
  }
}

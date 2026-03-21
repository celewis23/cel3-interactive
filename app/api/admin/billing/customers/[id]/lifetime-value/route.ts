export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken, COOKIE_NAME } from "@/lib/admin/auth";
import { stripe } from "@/lib/stripe";

function requireAuth(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return false;
  return verifySessionToken(token)?.step === "full";
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!requireAuth(req))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: customerId } = await params;

  try {
    let total = 0;
    let currency = "usd";
    let hasMore = true;
    let startingAfter: string | undefined;

    while (hasMore) {
      const result = await stripe.invoices.list({
        customer: customerId,
        status: "paid",
        limit: 100,
        ...(startingAfter ? { starting_after: startingAfter } : {}),
      });

      for (const inv of result.data) {
        total += inv.amount_paid;
        if (inv.currency) currency = inv.currency;
      }

      hasMore = result.has_more;
      startingAfter = result.has_more
        ? result.data[result.data.length - 1]?.id
        : undefined;
    }

    return NextResponse.json({ lifetimeValue: total, currency });
  } catch (err) {
    console.error("LIFETIME_VALUE_ERROR:", err);
    return NextResponse.json({ error: "Failed to fetch lifetime value" }, { status: 500 });
  }
}

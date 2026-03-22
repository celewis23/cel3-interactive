export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/permissions";
import { stripe } from "@/lib/stripe";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authErr = await requirePermission(req, "billing", "view");
  if (authErr) return authErr;

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

import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/permissions";
import { listInvoices, createInvoice } from "@/lib/stripe/billing";
import Stripe from "stripe";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const authErr = await requirePermission(req, "billing", "view");
  if (authErr) return authErr;

  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") as Stripe.Invoice.Status | null;
    const customerId = searchParams.get("customerId") ?? undefined;
    const limit = searchParams.get("limit") ? Number(searchParams.get("limit")) : undefined;
    const startingAfter = searchParams.get("startingAfter") ?? undefined;

    const result = await listInvoices({
      customerId,
      status: status ?? undefined,
      limit,
      startingAfter,
    });
    return NextResponse.json(result);
  } catch (err: unknown) {
    console.error("BILLING_ERROR:", err);
    return NextResponse.json({ error: "Failed to fetch invoices" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const authErr = await requirePermission(req, "billing", "edit");
  if (authErr) return authErr;

  try {
    const body = await req.json();
    const { customerId, daysUntilDue, description, lineItems, send } = body;

    if (!customerId) {
      return NextResponse.json({ error: "customerId is required" }, { status: 400 });
    }
    if (!Array.isArray(lineItems) || lineItems.length === 0) {
      return NextResponse.json({ error: "lineItems must be a non-empty array" }, { status: 400 });
    }

    const invoice = await createInvoice({
      customerId,
      daysUntilDue: daysUntilDue ?? 30,
      description,
      lineItems,
      send: send ?? false,
    });

    return NextResponse.json(invoice, { status: 201 });
  } catch (err: unknown) {
    console.error("BILLING_ERROR:", err);
    return NextResponse.json({ error: "Failed to create invoice" }, { status: 500 });
  }
}

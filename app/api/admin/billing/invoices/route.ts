import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/permissions";
import { listInvoices, createInvoice } from "@/lib/stripe/billing";
import { ensureStripeCustomerForPipelineContact, syncStripeInvoiceToSanity } from "@/lib/stripe/sync";
import Stripe from "stripe";
import { logAudit, AuditAction } from "@/lib/audit/log";

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
    await Promise.all(result.invoices.map((invoice) => syncStripeInvoiceToSanity(invoice)));
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
    const { customerId: rawCustomerId, pipelineContactId, createStripeCustomer, daysUntilDue, description, lineItems, send } = body;
    let customerId = rawCustomerId as string | undefined;

    if (!customerId && pipelineContactId) {
      const resolved = await ensureStripeCustomerForPipelineContact(pipelineContactId);
      customerId = resolved.customer.id;
    }

    if (!customerId && createStripeCustomer) {
      return NextResponse.json({ error: "A backoffice client is required to create a Stripe customer." }, { status: 400 });
    }

    if (!customerId) {
      return NextResponse.json({ error: "customerId or pipelineContactId is required" }, { status: 400 });
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
    await syncStripeInvoiceToSanity(invoice);

    logAudit(req, {
      action: AuditAction.BILLING_INVOICE_CREATED,
      resourceType: "invoice",
      resourceId: invoice.id,
      resourceLabel: invoice.number ?? invoice.id,
      description: `Invoice created for customer ${customerId}`,
    });

    return NextResponse.json(invoice, { status: 201 });
  } catch (err: unknown) {
    console.error("BILLING_ERROR:", err);
    return NextResponse.json({ error: "Failed to create invoice" }, { status: 500 });
  }
}

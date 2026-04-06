import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/permissions";
import { listInvoices, createInvoice } from "@/lib/stripe/billing";
import { ensureStripeCustomerForPipelineContact, syncStripeInvoiceToSanity } from "@/lib/stripe/sync";
import Stripe from "stripe";
import { logAudit, AuditAction } from "@/lib/audit/log";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const authErr = await requirePermission(req, "invoices", "view");
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
  const authErr = await requirePermission(req, "invoices", "edit");
  if (authErr) return authErr;

  try {
    const body = await req.json();
    const {
      customerId: rawCustomerId,
      pipelineContactId: rawPipelineContactId,
      createStripeCustomer,
      daysUntilDue,
      description,
      lineItems,
      send,
    } = body as {
      customerId?: unknown;
      pipelineContactId?: unknown;
      createStripeCustomer?: unknown;
      daysUntilDue?: unknown;
      description?: unknown;
      lineItems?: unknown;
      send?: unknown;
    };
    const pipelineContactId =
      typeof rawPipelineContactId === "string" && rawPipelineContactId.trim()
        ? rawPipelineContactId.trim()
        : undefined;
    let customerId =
      typeof rawCustomerId === "string" && rawCustomerId.trim()
        ? rawCustomerId.trim()
        : undefined;
    const normalizedDaysUntilDue =
      typeof daysUntilDue === "number" && Number.isFinite(daysUntilDue)
        ? Math.max(1, Math.min(365, Math.round(daysUntilDue)))
        : 30;
    const normalizedDescription =
      typeof description === "string" && description.trim() ? description.trim() : undefined;
    const normalizedLineItems = Array.isArray(lineItems)
      ? lineItems
          .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
          .map((item) => ({
            description:
              typeof item.description === "string" ? item.description.trim() : "",
            amount:
              typeof item.amount === "number"
                ? item.amount
                : Number(item.amount),
            quantity:
              item.quantity === undefined
                ? 1
                : typeof item.quantity === "number"
                  ? item.quantity
                  : Number(item.quantity),
          }))
          .filter(
            (item) =>
              item.description &&
              Number.isFinite(item.amount) &&
              item.amount > 0 &&
              Number.isFinite(item.quantity) &&
              item.quantity > 0
          )
      : [];

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
    if (normalizedLineItems.length === 0) {
      return NextResponse.json(
        { error: "lineItems must include at least one item with a description and positive amount" },
        { status: 400 }
      );
    }

    const invoice = await createInvoice({
      customerId,
      daysUntilDue: normalizedDaysUntilDue,
      description: normalizedDescription,
      lineItems: normalizedLineItems,
      send: Boolean(send),
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
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create invoice" },
      { status: 500 }
    );
  }
}

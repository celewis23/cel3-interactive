import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/permissions";
import { getInvoice, updateInvoice } from "@/lib/stripe/billing";
import { syncStripeInvoiceToSanity } from "@/lib/stripe/sync";
import { logAudit } from "@/lib/audit/log";

export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authErr = await requirePermission(req, "invoices", "view");
  if (authErr) return authErr;

  try {
    const { id } = await params;
    const invoice = await getInvoice(id);
    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }
    await syncStripeInvoiceToSanity(invoice);
    return NextResponse.json(invoice);
  } catch (err: unknown) {
    console.error("BILLING_ERROR:", err);
    return NextResponse.json({ error: "Failed to fetch invoice" }, { status: 500 });
  }
}

function unixFromDate(value: unknown) {
  if (typeof value !== "string" || !value) return undefined;
  const date = new Date(`${value}T12:00:00Z`);
  const time = date.getTime();
  return Number.isFinite(time) ? Math.floor(time / 1000) : undefined;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authErr = await requirePermission(req, "invoices", "edit");
  if (authErr) return authErr;

  try {
    const { id } = await params;
    const body = await req.json();
    const dueDate = unixFromDate(body.dueDate);
    const rawDaysUntilDue = body.daysUntilDue === undefined ? undefined : Number(body.daysUntilDue);
    const daysUntilDue =
      rawDaysUntilDue !== undefined && Number.isFinite(rawDaysUntilDue) && rawDaysUntilDue > 0
        ? Math.min(365, Math.round(rawDaysUntilDue))
        : undefined;
    const collectionMethod =
      body.collectionMethod === "charge_automatically" || body.collectionMethod === "send_invoice"
        ? body.collectionMethod
        : undefined;

    const invoice = await updateInvoice(id, {
      description:
        typeof body.description === "string" ? body.description.trim() || null : undefined,
      dueDate,
      daysUntilDue,
      collectionMethod,
    });
    await syncStripeInvoiceToSanity(invoice);

    logAudit(req, {
      action: "billing.invoice_updated",
      resourceType: "invoice",
      resourceId: invoice.id,
      resourceLabel: invoice.number ?? invoice.id,
      description: `Invoice ${invoice.number ?? invoice.id} updated`,
    });

    return NextResponse.json(invoice);
  } catch (err) {
    console.error("BILLING_UPDATE_INVOICE_ERROR:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to update invoice" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/permissions";
import { replaceInvoice } from "@/lib/stripe/billing";
import { syncStripeInvoiceToSanity } from "@/lib/stripe/sync";
import { logAudit } from "@/lib/audit/log";

export const runtime = "nodejs";

function unixFromDate(value: unknown) {
  if (typeof value !== "string" || !value) return undefined;
  const date = new Date(`${value}T12:00:00Z`);
  const time = date.getTime();
  return Number.isFinite(time) ? Math.floor(time / 1000) : undefined;
}

function normalizeLineItems(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
    .map((item) => ({
      description: typeof item.description === "string" ? item.description.trim() : "",
      amount: typeof item.amount === "number" ? item.amount : Number(item.amount),
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
    );
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authErr = await requirePermission(req, "invoices", "edit");
  if (authErr) return authErr;

  try {
    const { id } = await params;
    const body = await req.json();
    const lineItems = normalizeLineItems(body.lineItems);
    if (!lineItems.length) {
      return NextResponse.json({ error: "At least one valid line item is required." }, { status: 400 });
    }

    const collectionMethod =
      body.collectionMethod === "charge_automatically" || body.collectionMethod === "send_invoice"
        ? body.collectionMethod
        : undefined;
    const daysUntilDue = Number(body.daysUntilDue);
    const result = await replaceInvoice(id, {
      description: typeof body.description === "string" ? body.description.trim() || undefined : undefined,
      lineItems,
      dueDate: unixFromDate(body.dueDate),
      daysUntilDue:
        Number.isFinite(daysUntilDue) && daysUntilDue > 0
          ? Math.min(365, Math.round(daysUntilDue))
          : undefined,
      collectionMethod,
      send: Boolean(body.send),
      voidOriginal: body.voidOriginal !== false,
    });

    await syncStripeInvoiceToSanity(result.replacement);
    if (result.original) await syncStripeInvoiceToSanity(result.original);

    logAudit(req, {
      action: "billing.invoice_replaced",
      resourceType: "invoice",
      resourceId: result.replacement.id,
      resourceLabel: result.replacement.number ?? result.replacement.id,
      description: `Invoice ${id} replaced by ${result.replacement.number ?? result.replacement.id}`,
      metadata: { originalInvoiceId: id, replacementInvoiceId: result.replacement.id },
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error("BILLING_REPLACE_INVOICE_ERROR:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to replace invoice" },
      { status: 500 }
    );
  }
}

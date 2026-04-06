import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/permissions";
import { voidInvoice } from "@/lib/stripe/billing";
import { syncStripeInvoiceToSanity } from "@/lib/stripe/sync";
import { logAudit, AuditAction } from "@/lib/audit/log";

export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authErr = await requirePermission(req, "invoices", "edit");
  if (authErr) return authErr;

  try {
    const { id } = await params;
    const invoice = await voidInvoice(id);
    await syncStripeInvoiceToSanity(invoice);

    logAudit(req, {
      action: AuditAction.BILLING_INVOICE_VOIDED,
      resourceType: "invoice",
      resourceId: id,
      resourceLabel: invoice.number ?? id,
      description: `Invoice ${invoice.number ?? id} voided`,
    });

    return NextResponse.json({ ok: true, invoice });
  } catch (err: unknown) {
    console.error("BILLING_ERROR:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to void invoice" },
      { status: 500 }
    );
  }
}

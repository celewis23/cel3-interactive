import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/permissions";
import { sendInvoice } from "@/lib/stripe/billing";
import { automationEngine } from "@/lib/automations/engine";
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
    const invoice = await sendInvoice(id);
    const synced = await syncStripeInvoiceToSanity(invoice);

    logAudit(req, {
      action: AuditAction.BILLING_INVOICE_SENT,
      resourceType: "invoice",
      resourceId: id,
      resourceLabel: invoice.number ?? id,
      description: `Invoice ${invoice.number ?? id} sent to customer`,
    });

    automationEngine.fire("default", "invoice_sent", {}, "invoice", id, synced.clientId ?? undefined);

    return NextResponse.json(invoice);
  } catch (err: unknown) {
    console.error("BILLING_ERROR:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to send invoice" },
      { status: 500 }
    );
  }
}

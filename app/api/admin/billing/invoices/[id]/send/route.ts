import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/permissions";
import { sendInvoice } from "@/lib/stripe/billing";
import { logAudit, AuditAction } from "@/lib/audit/log";

export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authErr = await requirePermission(req, "billing", "edit");
  if (authErr) return authErr;

  try {
    const { id } = await params;
    const invoice = await sendInvoice(id);

    logAudit(req, {
      action: AuditAction.BILLING_INVOICE_SENT,
      resourceType: "invoice",
      resourceId: id,
      resourceLabel: invoice.number ?? id,
      description: `Invoice ${invoice.number ?? id} sent to customer`,
    });

    return NextResponse.json(invoice);
  } catch (err: unknown) {
    console.error("BILLING_ERROR:", err);
    return NextResponse.json({ error: "Failed to send invoice" }, { status: 500 });
  }
}

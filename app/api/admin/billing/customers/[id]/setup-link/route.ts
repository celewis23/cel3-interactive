import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/permissions";
import { createCustomerAutoPaySetupLink } from "@/lib/stripe/billing";
import { logAudit } from "@/lib/audit/log";

export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authErr = await requirePermission(req, "billing", "edit");
  if (authErr) return authErr;

  try {
    const { id } = await params;
    const origin = req.nextUrl.origin;
    const returnPath = `/admin/billing/customers/${encodeURIComponent(id)}`;
    const link = await createCustomerAutoPaySetupLink({
      customerId: id,
      successUrl: `${origin}${returnPath}?autopay=setup-complete`,
      cancelUrl: `${origin}${returnPath}?autopay=setup-canceled`,
    });

    logAudit(req, {
      action: "billing.autopay_setup_link_created",
      resourceType: "customer",
      resourceId: id,
      resourceLabel: id,
      description: `Auto-pay setup link created for customer ${id}`,
      metadata: { checkoutSessionId: link.id },
    });

    return NextResponse.json(link);
  } catch (err) {
    console.error("BILLING_AUTOPAY_LINK_ERROR:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create auto-pay setup link" },
      { status: 500 }
    );
  }
}

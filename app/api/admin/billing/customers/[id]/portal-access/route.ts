import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/permissions";
import { ensurePortalAccessForStripeCustomer } from "@/lib/portal/provision";

export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authErr = await requirePermission(req, "clients", "edit");
  if (authErr) return authErr;

  try {
    const { id } = await params;
    const portalUser = await ensurePortalAccessForStripeCustomer(id);
    return NextResponse.json({ portalUser });
  } catch (err) {
    console.error("BILLING_CUSTOMER_PORTAL_ACCESS_ERR:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to provision portal access" },
      { status: 500 }
    );
  }
}

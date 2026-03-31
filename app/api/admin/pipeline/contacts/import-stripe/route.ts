import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/permissions";
import { getCustomer } from "@/lib/stripe/billing";
import { syncPipelineContactToGoogleContact } from "@/lib/google/contactSync";
import { syncStripeCustomerToPipelineContact } from "@/lib/stripe/sync";
import { logAudit, AuditAction } from "@/lib/audit/log";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const authErr = await requirePermission(req, "leads", "edit");
  if (authErr) return authErr;

  try {
    const body = await req.json();
    const customerId = typeof body.customerId === "string" ? body.customerId.trim() : "";
    if (!customerId) {
      return NextResponse.json({ error: "customerId is required" }, { status: 400 });
    }

    const customer = await getCustomer(customerId);
    if (!customer) {
      return NextResponse.json({ error: "Stripe customer not found" }, { status: 404 });
    }

    const contact = await syncStripeCustomerToPipelineContact(customer, {
      source: "Stripe",
      stage: "won",
    });
    const googleContact = await syncPipelineContactToGoogleContact({ pipelineContactId: contact._id });

    logAudit(req, {
      action: AuditAction.LEAD_CONVERTED,
      resourceType: "contact",
      resourceId: contact._id,
      resourceLabel: contact.name,
      description: `Imported Stripe customer ${customerId} into pipeline`,
    });

    return NextResponse.json({
      ok: true,
      contact: {
        ...contact,
        googleContactResourceName: googleContact.resourceName,
      },
      googleContact,
    });
  } catch (err) {
    console.error("PIPELINE_IMPORT_STRIPE_ERR:", err);
    const message = err instanceof Error ? err.message : "Failed to import Stripe customer";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

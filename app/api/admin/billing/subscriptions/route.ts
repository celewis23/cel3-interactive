import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/permissions";
import { createSubscription, listSubscriptions } from "@/lib/stripe/billing";
import { ensureStripeCustomerForPipelineContact } from "@/lib/stripe/sync";
import { logAudit } from "@/lib/audit/log";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const authErr = await requirePermission(req, "billing", "view");
  if (authErr) return authErr;

  try {
    const { searchParams } = new URL(req.url);
    const customerId = searchParams.get("customerId") ?? undefined;
    const status = searchParams.get("status") ?? undefined;
    const limit = searchParams.get("limit") ? Number(searchParams.get("limit")) : undefined;
    const startingAfter = searchParams.get("startingAfter") ?? undefined;

    const result = await listSubscriptions({ customerId, status, limit, startingAfter });
    return NextResponse.json(result);
  } catch (err: unknown) {
    console.error("BILLING_ERROR:", err);
    return NextResponse.json({ error: "Failed to fetch subscriptions" }, { status: 500 });
  }
}

function unixFromDate(value: unknown) {
  if (typeof value !== "string" || !value) return undefined;
  const date = new Date(`${value}T12:00:00Z`);
  const time = date.getTime();
  return Number.isFinite(time) ? Math.floor(time / 1000) : undefined;
}

export async function POST(req: NextRequest) {
  const authErr = await requirePermission(req, "billing", "edit");
  if (authErr) return authErr;

  try {
    const body = await req.json();
    let customerId = typeof body.customerId === "string" && body.customerId.trim()
      ? body.customerId.trim()
      : undefined;
    const pipelineContactId = typeof body.pipelineContactId === "string" && body.pipelineContactId.trim()
      ? body.pipelineContactId.trim()
      : undefined;

    if (!customerId && pipelineContactId) {
      const resolved = await ensureStripeCustomerForPipelineContact(pipelineContactId);
      customerId = resolved.customer.id;
    }

    const productName = typeof body.productName === "string" && body.productName.trim()
      ? body.productName.trim()
      : "Recurring service";
    const amount = Number(body.amount);
    const interval = ["day", "week", "month", "year"].includes(body.interval)
      ? body.interval
      : "month";
    const intervalCount = Math.max(1, Math.round(Number(body.intervalCount) || 1));
    const collectionMethod =
      body.collectionMethod === "send_invoice" ? "send_invoice" : "charge_automatically";
    const daysUntilDue = Math.max(1, Math.min(365, Math.round(Number(body.daysUntilDue) || 30)));

    if (!customerId) {
      return NextResponse.json({ error: "customerId or pipelineContactId is required" }, { status: 400 });
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: "A positive amount is required." }, { status: 400 });
    }

    const subscription = await createSubscription({
      customerId,
      productName,
      amount,
      interval,
      intervalCount,
      collectionMethod,
      daysUntilDue,
      billingCycleAnchor: unixFromDate(body.billingDate),
      description: typeof body.description === "string" ? body.description.trim() || undefined : undefined,
    });

    logAudit(req, {
      action: "billing.subscription_created",
      resourceType: "subscription",
      resourceId: subscription.id,
      resourceLabel: subscription.id,
      description: `Subscription created for customer ${customerId}`,
    });

    return NextResponse.json(subscription, { status: 201 });
  } catch (err) {
    console.error("BILLING_CREATE_SUBSCRIPTION_ERROR:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create subscription" },
      { status: 500 }
    );
  }
}

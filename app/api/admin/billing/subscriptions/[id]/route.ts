import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/permissions";
import { cancelSubscription, getSubscription, updateSubscription } from "@/lib/stripe/billing";
import { logAudit } from "@/lib/audit/log";

export const runtime = "nodejs";

function unixFromDate(value: unknown) {
  if (typeof value !== "string" || !value) return undefined;
  const date = new Date(`${value}T12:00:00Z`);
  const time = date.getTime();
  return Number.isFinite(time) ? Math.floor(time / 1000) : undefined;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authErr = await requirePermission(req, "billing", "view");
  if (authErr) return authErr;

  try {
    const { id } = await params;
    const subscription = await getSubscription(id);
    if (!subscription) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(subscription);
  } catch (err) {
    console.error("BILLING_GET_SUBSCRIPTION_ERROR:", err);
    return NextResponse.json({ error: "Failed to fetch subscription" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authErr = await requirePermission(req, "billing", "edit");
  if (authErr) return authErr;

  try {
    const { id } = await params;
    const body = await req.json();
    const amount = body.amount === undefined || body.amount === "" ? undefined : Number(body.amount);
    const interval = ["day", "week", "month", "year"].includes(body.interval)
      ? body.interval
      : undefined;
    const intervalCount =
      body.intervalCount === undefined || body.intervalCount === ""
        ? undefined
        : Math.max(1, Math.round(Number(body.intervalCount)));
    const collectionMethod =
      body.collectionMethod === "charge_automatically" || body.collectionMethod === "send_invoice"
        ? body.collectionMethod
        : undefined;
    const daysUntilDue =
      body.daysUntilDue === undefined || body.daysUntilDue === ""
        ? undefined
        : Math.max(1, Math.min(365, Math.round(Number(body.daysUntilDue))));

    if (amount !== undefined && (!Number.isFinite(amount) || amount <= 0)) {
      return NextResponse.json({ error: "Amount must be positive." }, { status: 400 });
    }

    const subscription = await updateSubscription(id, {
      productName:
        typeof body.productName === "string" && body.productName.trim()
          ? body.productName.trim()
          : undefined,
      amount,
      interval,
      intervalCount,
      billingCycleAnchor: unixFromDate(body.billingDate),
      collectionMethod,
      daysUntilDue,
      cancelAtPeriodEnd:
        typeof body.cancelAtPeriodEnd === "boolean" ? body.cancelAtPeriodEnd : undefined,
    });

    logAudit(req, {
      action: "billing.subscription_updated",
      resourceType: "subscription",
      resourceId: subscription.id,
      resourceLabel: subscription.id,
      description: `Subscription ${subscription.id} updated`,
    });

    return NextResponse.json(subscription);
  } catch (err) {
    console.error("BILLING_UPDATE_SUBSCRIPTION_ERROR:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to update subscription" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authErr = await requirePermission(req, "billing", "edit");
  if (authErr) return authErr;

  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const atPeriodEnd = searchParams.get("atPeriodEnd") === "true";
    const subscription = await cancelSubscription(id, { atPeriodEnd });

    logAudit(req, {
      action: atPeriodEnd ? "billing.subscription_cancel_scheduled" : "billing.subscription_canceled",
      resourceType: "subscription",
      resourceId: subscription.id,
      resourceLabel: subscription.id,
      description: atPeriodEnd
        ? `Subscription ${subscription.id} scheduled to cancel at period end`
        : `Subscription ${subscription.id} canceled immediately`,
    });

    return NextResponse.json(subscription);
  } catch (err) {
    console.error("BILLING_CANCEL_SUBSCRIPTION_ERROR:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to cancel subscription" },
      { status: 500 }
    );
  }
}

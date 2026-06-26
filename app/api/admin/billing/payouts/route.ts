import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/permissions";
import { createPayout } from "@/lib/stripe/billing";
import { logAudit } from "@/lib/audit/log";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const authErr = await requirePermission(req, "billing", "edit");
  if (authErr) return authErr;

  try {
    const body = await req.json();
    const amount = Number(body.amount);
    const currency =
      typeof body.currency === "string" && body.currency.trim()
        ? body.currency.trim().toLowerCase()
        : "usd";
    const method = body.method === "instant" ? "instant" : "standard";
    const sourceType =
      body.sourceType === "card" ||
      body.sourceType === "bank_account" ||
      body.sourceType === "fpx"
        ? body.sourceType
        : undefined;

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: "A positive payout amount is required." }, { status: 400 });
    }

    const payout = await createPayout({
      amount,
      currency,
      method,
      sourceType,
      description:
        typeof body.description === "string" && body.description.trim()
          ? body.description.trim()
          : "Manual admin payout",
      statementDescriptor:
        typeof body.statementDescriptor === "string" && body.statementDescriptor.trim()
          ? body.statementDescriptor.trim()
          : undefined,
    });

    logAudit(req, {
      action: "billing.payout_created",
      resourceType: "payout",
      resourceId: payout.id,
      resourceLabel: payout.id,
      description: `Manual ${method} payout created for ${currency.toUpperCase()} ${amount.toFixed(2)}`,
      metadata: {
        payoutId: payout.id,
        amountCents: payout.amount,
        currency: payout.currency,
        method: payout.method,
        sourceType: sourceType ?? null,
      },
    });

    return NextResponse.json(payout, { status: 201 });
  } catch (err) {
    console.error("BILLING_CREATE_PAYOUT_ERROR:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create payout" },
      { status: 500 }
    );
  }
}

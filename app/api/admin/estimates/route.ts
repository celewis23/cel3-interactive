import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/permissions";
import { sanityServer } from "@/lib/sanityServer";
import { sanityWriteClient } from "@/lib/sanity.write";

export const runtime = "nodejs";

function computeAmounts(
  lineItems: Array<{ quantity: number; rate: number }>,
  taxRate: number,
  discountType: "percent" | "fixed" | null,
  discountValue: number | null
) {
  const itemsWithAmounts = lineItems.map((item) => ({
    ...item,
    amount: item.quantity * item.rate,
  }));
  const subtotal = itemsWithAmounts.reduce((s, i) => s + i.amount, 0);
  const taxAmount = subtotal * (taxRate / 100);
  let discountAmount = 0;
  if (discountType === "percent" && discountValue) {
    discountAmount = subtotal * (discountValue / 100);
  } else if (discountType === "fixed" && discountValue) {
    discountAmount = discountValue;
  }
  const total = subtotal + taxAmount - discountAmount;
  return { itemsWithAmounts, subtotal, taxAmount, discountAmount, total };
}

export async function GET(req: NextRequest) {
  const authErr = await requirePermission(req, "estimates", "view");
  if (authErr) return authErr;
  try {
    const estimates = await sanityServer.fetch(
      `*[_type == "estimate"] | order(_createdAt desc)`
    );
    return NextResponse.json(estimates);
  } catch (err) {
    console.error("ESTIMATES_LIST_ERR:", err);
    return NextResponse.json({ error: "Failed to list estimates" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const authErr = await requirePermission(req, "estimates", "edit");
  if (authErr) return authErr;
  try {
    const body = await req.json();

    if (!body.clientName || typeof body.clientName !== "string" || !body.clientName.trim()) {
      return NextResponse.json({ error: "clientName is required" }, { status: 400 });
    }

    // Auto-generate number
    const count = await sanityServer.fetch<number>(`count(*[_type == "estimate"])`);
    const year = new Date().getFullYear();
    const number = `EST-${year}-${String(count + 1).padStart(3, "0")}`;

    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);
    const expiryDate = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);

    const rawLineItems: Array<{ description: string; quantity: number; rate: number }> =
      body.lineItems ?? [];
    const taxRate: number = body.taxRate ?? 0;
    const discountType: "percent" | "fixed" | null = body.discountType ?? null;
    const discountValue: number | null = body.discountValue ?? null;

    const { itemsWithAmounts, subtotal, taxAmount, discountAmount, total } = computeAmounts(
      rawLineItems,
      taxRate,
      discountType,
      discountValue
    );

    const lineItemsWithKeys = itemsWithAmounts.map((item) => ({
      _key: crypto.randomUUID(),
      ...item,
    }));

    const doc = {
      _type: "estimate",
      number,
      date: body.date ?? todayStr,
      expiryDate: body.expiryDate ?? expiryDate,
      status: "draft",
      clientName: body.clientName.trim(),
      clientEmail: body.clientEmail ?? null,
      clientCompany: body.clientCompany ?? null,
      pipelineContactId: body.pipelineContactId ?? null,
      stripeCustomerId: body.stripeCustomerId ?? null,
      lineItems: lineItemsWithKeys,
      subtotal,
      taxRate,
      taxAmount,
      discountType,
      discountValue,
      discountAmount,
      total,
      notes: body.notes ?? null,
      currency: "usd",
      approvalToken: crypto.randomUUID(),
      sentAt: null,
      viewedAt: null,
      approvedAt: null,
      declinedAt: null,
      stripeInvoiceId: null,
    };

    const created = await sanityWriteClient.create(doc);
    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    console.error("ESTIMATES_CREATE_ERR:", err);
    return NextResponse.json({ error: "Failed to create estimate" }, { status: 500 });
  }
}

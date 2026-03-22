import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken, COOKIE_NAME } from "@/lib/admin/auth";
import { sanityServer } from "@/lib/sanityServer";
import { sanityWriteClient } from "@/lib/sanity.write";

export const runtime = "nodejs";

function requireAuth(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return false;
  return verifySessionToken(token)?.step === "full";
}

const ALLOWED_FIELDS = [
  "clientName",
  "clientEmail",
  "clientCompany",
  "pipelineContactId",
  "stripeCustomerId",
  "date",
  "expiryDate",
  "status",
  "lineItems",
  "taxRate",
  "discountType",
  "discountValue",
  "notes",
  "currency",
];

function computeAmounts(
  lineItems: Array<{ description: string; quantity: number; rate: number; _key?: string }>,
  taxRate: number,
  discountType: "percent" | "fixed" | null,
  discountValue: number | null
) {
  const itemsWithAmounts = lineItems.map((item) => ({
    ...item,
    _key: item._key ?? crypto.randomUUID(),
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

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  if (!requireAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { id } = await params;
    const estimate = await sanityServer.fetch(`*[_type == "estimate" && _id == $id][0]`, { id });
    if (!estimate) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(estimate);
  } catch (err) {
    console.error("ESTIMATES_GET_ERR:", err);
    return NextResponse.json({ error: "Failed to fetch estimate" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  if (!requireAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { id } = await params;
    const body = await req.json();

    // Fetch current
    const current = await sanityServer.fetch<{
      lineItems: Array<{ description: string; quantity: number; rate: number; _key: string; amount: number }>;
      taxRate: number;
      discountType: "percent" | "fixed" | null;
      discountValue: number | null;
      status: string;
      approvedAt: string | null;
      declinedAt: string | null;
    }>(`*[_type == "estimate" && _id == $id][0]`, { id });

    if (!current) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Filter to allowed fields
    const patch: Record<string, unknown> = {};
    for (const field of ALLOWED_FIELDS) {
      if (field in body) {
        patch[field] = body[field];
      }
    }

    // Recompute amounts from merged state
    const lineItems = "lineItems" in patch
      ? (patch.lineItems as Array<{ description: string; quantity: number; rate: number; _key?: string }>)
      : current.lineItems;
    const taxRate = "taxRate" in patch ? (patch.taxRate as number) : current.taxRate;
    const discountType = "discountType" in patch
      ? (patch.discountType as "percent" | "fixed" | null)
      : current.discountType;
    const discountValue = "discountValue" in patch
      ? (patch.discountValue as number | null)
      : current.discountValue;

    const { itemsWithAmounts, subtotal, taxAmount, discountAmount, total } = computeAmounts(
      lineItems,
      taxRate,
      discountType,
      discountValue
    );

    patch.lineItems = itemsWithAmounts;
    patch.subtotal = subtotal;
    patch.taxAmount = taxAmount;
    patch.discountAmount = discountAmount;
    patch.total = total;

    // Status transition timestamps
    const newStatus = patch.status as string | undefined;
    if (newStatus === "approved" && !current.approvedAt) {
      patch.approvedAt = new Date().toISOString();
    }
    if (newStatus === "declined" && !current.declinedAt) {
      patch.declinedAt = new Date().toISOString();
    }

    const updated = await sanityWriteClient.patch(id).set(patch).commit();
    return NextResponse.json(updated);
  } catch (err) {
    console.error("ESTIMATES_PATCH_ERR:", err);
    return NextResponse.json({ error: "Failed to update estimate" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  if (!requireAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { id } = await params;
    await sanityWriteClient.delete(id);
    return NextResponse.json({ deleted: true });
  } catch (err) {
    console.error("ESTIMATES_DELETE_ERR:", err);
    return NextResponse.json({ error: "Failed to delete estimate" }, { status: 500 });
  }
}

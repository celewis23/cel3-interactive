import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/permissions";
import { sanityServer } from "@/lib/sanityServer";
import { sanityWriteClient } from "@/lib/sanity.write";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const authErr = await requirePermission(req, "estimates", "edit");
  if (authErr) return authErr;
  try {
    const { id } = await params;

    const original = await sanityServer.fetch<Record<string, unknown>>(
      `*[_type == "estimate" && _id == $id][0]`,
      { id }
    );
    if (!original) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Auto-generate new number
    const count = await sanityServer.fetch<number>(`count(*[_type == "estimate"])`);
    const year = new Date().getFullYear();
    const number = `EST-${year}-${String(count + 1).padStart(3, "0")}`;

    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);
    const expiryDate = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);

    // Re-key line items
    const lineItems = (
      original.lineItems as Array<Record<string, unknown>>
    ).map((item) => ({
      ...item,
      _key: crypto.randomUUID(),
    }));

    const newDoc = {
      ...original,
      _type: "estimate",
      _id: undefined,
      _rev: undefined,
      _createdAt: undefined,
      _updatedAt: undefined,
      number,
      status: "draft",
      date: todayStr,
      expiryDate,
      approvalToken: crypto.randomUUID(),
      sentAt: null,
      viewedAt: null,
      approvedAt: null,
      declinedAt: null,
      stripeInvoiceId: null,
      lineItems,
    };

    // Remove undefined fields
    for (const key of Object.keys(newDoc)) {
      if ((newDoc as Record<string, unknown>)[key] === undefined) {
        delete (newDoc as Record<string, unknown>)[key];
      }
    }

    const created = await sanityWriteClient.create(newDoc);
    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    console.error("ESTIMATES_DUPLICATE_ERR:", err);
    return NextResponse.json({ error: "Failed to duplicate estimate" }, { status: 500 });
  }
}

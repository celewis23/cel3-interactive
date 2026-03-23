export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { requirePermission, getSessionInfo } from "@/lib/admin/permissions";
import { sanityServer } from "@/lib/sanityServer";
import { sanityWriteClient } from "@/lib/sanity.write";

export async function GET(req: NextRequest) {
  const authErr = await requirePermission(req, "expenses", "view");
  if (authErr) return authErr;

  try {
    const session = getSessionInfo(req);
    const filters = [`_type == "expenseRecurring"`];

    if (session && !session.isOwner && session.staffId) {
      filters.push(`staffId == "${session.staffId}"`);
    }

    const recurring = await sanityServer.fetch(
      `*[${filters.join(" && ")}] | order(nextDueDate asc) {
        _id, name, amountCents, currency, vendor, categoryId, description,
        paymentMethod, taxDeductible, clientName, projectId,
        frequency, nextDueDate, active, staffId
      }`
    );

    return NextResponse.json(recurring);
  } catch (err) {
    console.error("RECURRING_GET_ERR:", err);
    return NextResponse.json({ error: "Failed to fetch recurring" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const authErr = await requirePermission(req, "expenses", "edit");
  if (authErr) return authErr;

  try {
    const session = getSessionInfo(req);
    const body = await req.json() as {
      name: string;
      amountCents: number;
      currency?: string;
      vendor: string;
      categoryId?: string;
      description?: string;
      paymentMethod?: string;
      taxDeductible?: boolean;
      clientName?: string;
      projectId?: string;
      frequency: "weekly" | "monthly" | "quarterly" | "annually";
      nextDueDate: string;
    };

    if (!body.name?.trim())    return NextResponse.json({ error: "name required" }, { status: 400 });
    if (!body.vendor?.trim())  return NextResponse.json({ error: "vendor required" }, { status: 400 });
    if (!body.frequency)       return NextResponse.json({ error: "frequency required" }, { status: 400 });
    if (!body.nextDueDate)     return NextResponse.json({ error: "nextDueDate required" }, { status: 400 });
    if (!body.amountCents || body.amountCents <= 0) return NextResponse.json({ error: "amount required" }, { status: 400 });

    const rec = await sanityWriteClient.create({
      _type: "expenseRecurring",
      name: body.name.trim(),
      amountCents: Math.round(body.amountCents),
      currency: body.currency ?? "USD",
      vendor: body.vendor.trim(),
      categoryId: body.categoryId ?? null,
      description: body.description?.trim() ?? null,
      paymentMethod: body.paymentMethod ?? "card",
      taxDeductible: body.taxDeductible ?? false,
      clientName: body.clientName?.trim() ?? null,
      projectId: body.projectId ?? null,
      frequency: body.frequency,
      nextDueDate: body.nextDueDate,
      active: true,
      staffId: session?.staffId ?? null,
    });

    return NextResponse.json(rec, { status: 201 });
  } catch (err) {
    console.error("RECURRING_POST_ERR:", err);
    return NextResponse.json({ error: "Failed to create recurring" }, { status: 500 });
  }
}

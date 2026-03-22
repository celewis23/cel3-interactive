import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/permissions";
import { sanityServer } from "@/lib/sanityServer";
import { sanityWriteClient } from "@/lib/sanity.write";
import { createInvoice, createCustomer, listCustomers } from "@/lib/stripe/billing";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const authErr = await requirePermission(req, "estimates", "edit");
  if (authErr) return authErr;
  try {
    const { id } = await params;

    const estimate = await sanityServer.fetch<{
      _id: string;
      number: string;
      clientName: string;
      clientEmail: string | null;
      stripeCustomerId: string | null;
      lineItems: Array<{ description: string; quantity: number; rate: number; amount: number }>;
      total: number;
      status: string;
    }>(`*[_type == "estimate" && _id == $id][0]`, { id });

    if (!estimate) return NextResponse.json({ error: "Not found" }, { status: 404 });

    let customerId = estimate.stripeCustomerId;

    if (!customerId) {
      // Try to find by email
      if (estimate.clientEmail) {
        const { customers } = await listCustomers({ email: estimate.clientEmail, limit: 1 });
        if (customers.length > 0) {
          customerId = customers[0].id;
        }
      }

      // Create if still not found
      if (!customerId) {
        const newCustomer = await createCustomer({
          name: estimate.clientName,
          ...(estimate.clientEmail ? { email: estimate.clientEmail } : {}),
        });
        customerId = newCustomer.id;
      }

      // Save stripeCustomerId back
      await sanityWriteClient.patch(id).set({ stripeCustomerId: customerId }).commit();
    }

    const lineItems = estimate.lineItems.map((item) => ({
      description: item.description,
      amount: item.amount, // dollars — createInvoice converts to cents internally
      quantity: item.quantity,
    }));

    const invoice = await createInvoice({
      customerId,
      lineItems,
      daysUntilDue: 30,
      send: false,
    });

    await sanityWriteClient
      .patch(id)
      .set({ stripeInvoiceId: invoice.id })
      .commit();

    return NextResponse.json({
      invoiceId: invoice.id,
      hostedInvoiceUrl: invoice.hostedInvoiceUrl,
    });
  } catch (err) {
    console.error("ESTIMATES_CONVERT_ERR:", err);
    return NextResponse.json({ error: "Failed to convert estimate to invoice" }, { status: 500 });
  }
}

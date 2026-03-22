import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/permissions";
import { sanityServer } from "@/lib/sanityServer";
import { sanityWriteClient } from "@/lib/sanity.write";
import { createInvoice } from "@/lib/stripe/billing";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const authErr = await requirePermission(req, "timeTracking", "edit");
  if (authErr) return authErr;
  try {
    const body = await req.json();
    const { stripeCustomerId, clientName, entryIds } = body;

    if (!stripeCustomerId) {
      return NextResponse.json({ error: "stripeCustomerId is required" }, { status: 400 });
    }

    // Fetch unbilled, billable entries for this customer
    let filter = `_type == "timeEntry" && billable == true && invoiceId == null && endTime != null`;
    if (clientName) filter += ` && clientName == "${clientName}"`;
    if (stripeCustomerId) filter += ` && stripeCustomerId == "${stripeCustomerId}"`;

    let entries = await sanityServer.fetch<Array<{
      _id: string;
      date: string;
      description: string | null;
      projectName: string | null;
      durationSeconds: number;
      hourlyRate: number;
    }>>(`*[${filter}] | order(date asc) { _id, date, description, projectName, durationSeconds, hourlyRate }`);

    // Filter to specific IDs if requested
    if (entryIds?.length) {
      entries = entries.filter((e) => entryIds.includes(e._id));
    }

    if (entries.length === 0) {
      return NextResponse.json({ error: "No unbilled time entries found for this client" }, { status: 400 });
    }

    // Build line items (amounts in cents for Stripe)
    const lineItems = entries.map((entry) => {
      const hours = entry.durationSeconds / 3600;
      const amountCents = Math.round(hours * entry.hourlyRate * 100);
      const hoursDisplay = hours % 1 === 0 ? `${hours}h` : `${hours.toFixed(2)}h`;
      const desc = [
        entry.description || "Time tracking",
        entry.projectName ? `(${entry.projectName})` : null,
        `${hoursDisplay} @ $${entry.hourlyRate}/hr`,
        `— ${entry.date}`,
      ]
        .filter(Boolean)
        .join(" ");
      return { description: desc, amount: amountCents, quantity: 1 };
    });

    // Create Stripe invoice
    const invoice = await createInvoice({
      customerId: stripeCustomerId,
      lineItems,
      description: `Time tracking invoice${clientName ? ` — ${clientName}` : ""}`,
      send: false,
    });

    // Mark entries as billed
    const now = new Date().toISOString();
    await Promise.all(
      entries.map((e) =>
        sanityWriteClient
          .patch(e._id)
          .set({ invoiceId: invoice.id, billedAt: now })
          .commit()
      )
    );

    return NextResponse.json({ invoice, billedCount: entries.length });
  } catch (err) {
    console.error("TIME_INVOICE_ERR:", err);
    return NextResponse.json({ error: "Failed to generate invoice from time entries" }, { status: 500 });
  }
}

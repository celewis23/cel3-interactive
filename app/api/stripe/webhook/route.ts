import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { sendPaidInvoiceReceipt } from "@/lib/billing/receipts";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "Webhook is not configured" }, { status: 503 });
  const signature = request.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  let event;
  try {
    event = stripe.webhooks.constructEvent(await request.text(), signature, secret);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }
  try {
    if (event.type === "invoice.paid") {
      await sendPaidInvoiceReceipt(event.data.object);
    }
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Stripe receipt webhook failed", error);
    return NextResponse.json({ error: "Receipt delivery failed; retry required" }, { status: 500 });
  }
}

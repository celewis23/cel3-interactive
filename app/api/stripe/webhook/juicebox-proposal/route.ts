import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { fulfillJuiceboxProposalCheckout } from "@/lib/mockups/juliansjuicebox/fulfillment";

export const runtime = "nodejs";

// Its own endpoint + signing secret (STRIPE_WEBHOOK_SECRET_JUICEBOX), separate from the
// existing /api/stripe/webhook and /api/stripe/webhook/hoops-proposal so none of the three
// can break each other.
export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET_JUICEBOX;
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
    if (event.type === "checkout.session.completed") {
      await fulfillJuiceboxProposalCheckout(event.data.object);
    }
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Julian's Juicebox proposal webhook handling failed", error);
    return NextResponse.json({ error: "Webhook handling failed; retry required" }, { status: 500 });
  }
}

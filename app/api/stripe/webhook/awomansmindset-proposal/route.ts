import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { fulfillAwmProposalCheckout } from "@/lib/mockups/awomansmindset/fulfillment";

export const runtime = "nodejs";

// Its own endpoint + signing secret (STRIPE_WEBHOOK_SECRET_AWOMANSMINDSET), separate from
// /api/stripe/webhook and the other mockup proposal webhooks so none of them can break
// each other.
export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET_AWOMANSMINDSET;
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
      await fulfillAwmProposalCheckout(event.data.object);
    }
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("A Woman's Mindset proposal webhook handling failed", error);
    return NextResponse.json({ error: "Webhook handling failed; retry required" }, { status: 500 });
  }
}

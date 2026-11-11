import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { listFailedHoopsWebhookEvents } from "@/lib/mockups/hoopsbasketballacademy/acceptance";
import { fulfillHoopsProposalCheckout } from "@/lib/mockups/hoopsbasketballacademy/fulfillment";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Backstop for the Hoops proposal webhook: Stripe already retries failed deliveries on
// its own, but this sweeps anything our own fulfillment code failed on (e.g. a transient
// Sanity/Gmail error) so a paid order never gets permanently stuck.
export async function GET() {
  const failed = await listFailedHoopsWebhookEvents();
  let retried = 0, stillFailing = 0;

  for (const event of failed) {
    try {
      const session = await stripe.checkout.sessions.retrieve(event.sessionId);
      await fulfillHoopsProposalCheckout(session);
      retried += 1;
    } catch (err) {
      stillFailing += 1;
      console.error("HOOPS_PROPOSAL_RETRY_ERR:", event.sessionId, err);
    }
  }

  return NextResponse.json({ checked: failed.length, retried, stillFailing });
}

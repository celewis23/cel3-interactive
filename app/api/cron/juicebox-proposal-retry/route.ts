import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { listFailedJuiceboxWebhookEvents } from "@/lib/mockups/juliansjuicebox/acceptance";
import { fulfillJuiceboxProposalCheckout } from "@/lib/mockups/juliansjuicebox/fulfillment";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Backstop for the Julian's Juicebox proposal webhook: Stripe already retries failed
// deliveries on its own, but this sweeps anything our own fulfillment code failed on (e.g.
// a transient Sanity/Gmail error) so a paid order never gets permanently stuck.
export async function GET() {
  const failed = await listFailedJuiceboxWebhookEvents();
  let retried = 0, stillFailing = 0;

  for (const event of failed) {
    try {
      const session = await stripe.checkout.sessions.retrieve(event.sessionId);
      await fulfillJuiceboxProposalCheckout(session);
      retried += 1;
    } catch (err) {
      stillFailing += 1;
      console.error("JUICEBOX_PROPOSAL_RETRY_ERR:", event.sessionId, err);
    }
  }

  return NextResponse.json({ checked: failed.length, retried, stillFailing });
}

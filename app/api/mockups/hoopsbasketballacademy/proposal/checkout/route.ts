import { NextRequest, NextResponse } from "next/server";
import { withActivity } from "@/lib/audit/withActivity";
import { stripe } from "@/lib/stripe";
import { createCustomer } from "@/lib/stripe/billing";
import { getHoopsAcceptance, markHoopsAcceptanceCheckoutCreated } from "@/lib/mockups/hoopsbasketballacademy/acceptance";
import { HoopsPricingError, quoteHoopsSelection } from "@/lib/mockups/hoopsbasketballacademy/pricing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function handleActivityPOST(req: NextRequest) {
  try {
    const body = await req.json();
    const acceptanceId = typeof body.acceptanceId === "string" ? body.acceptanceId : null;
    if (!acceptanceId) return NextResponse.json({ error: "Missing acceptanceId" }, { status: 400 });

    const acceptance = await getHoopsAcceptance(acceptanceId);
    if (!acceptance) return NextResponse.json({ error: "Acceptance not found" }, { status: 404 });
    if (acceptance.status !== "accepted") {
      return NextResponse.json({ error: "This acceptance has already been used." }, { status: 409 });
    }

    // The browser's selectionId/addOn are only a sanity check against what was actually
    // signed — the charge always comes from the acceptance record, never the request body.
    if (body.selectionId !== acceptance.selectionId || Boolean(body.addOn) !== acceptance.addOnRequested) {
      return NextResponse.json({ error: "Selection does not match what was signed." }, { status: 409 });
    }

    const quote = quoteHoopsSelection(acceptance.selectionId, acceptance.addOnRequested);

    const customer = await createCustomer({
      name: acceptance.businessName,
      email: acceptance.email,
      phone: acceptance.phone,
      description: `Hoops Basketball Academy — ${quote.lineItemName}`,
    });

    const origin = req.nextUrl.origin;
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer: customer.id,
      payment_intent_data: { setup_future_usage: "off_session" },
      line_items: [{
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: quote.dueTodayCents,
          product_data: {
            name: quote.lineItemName,
            description: `Due today, paid in full. $${(quote.monthlyCents / 100).toFixed(2)}/month begins the month the platform launches.`,
          },
        },
      }],
      metadata: {
        proposalSlug: "hoopsbasketballacademy",
        acceptanceId: acceptance._id,
        selectionId: acceptance.selectionId,
        addOn: String(acceptance.addOnRequested),
      },
      success_url: `${origin}/mockups/hoopsbasketballacademy/proposal/thank-you?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/mockups/hoopsbasketballacademy/proposal`,
    });

    await markHoopsAcceptanceCheckoutCreated(acceptance._id, session.id, customer.id);

    if (!session.url) throw new Error("Stripe did not return a Checkout URL");
    return NextResponse.json({ url: session.url });
  } catch (err) {
    if (err instanceof HoopsPricingError) return NextResponse.json({ error: err.message }, { status: 400 });
    console.error("HOOPS_PROPOSAL_CHECKOUT_ERR:", err);
    return NextResponse.json({ error: "Could not start checkout. Please try again." }, { status: 500 });
  }
}

export const POST = withActivity("/api/mockups/hoopsbasketballacademy/proposal/checkout", "POST", handleActivityPOST);

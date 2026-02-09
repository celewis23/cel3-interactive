// app/api/stripe/assessment/route.ts
import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";

export async function POST() {
  try {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL!;
    if (!siteUrl) {
      return NextResponse.json(
        { ok: false, message: "NEXT_PUBLIC_SITE_URL is not set." },
        { status: 500 }
      );
    }

    // Fixed-price entry offer
    const amountInCents = 100;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      billing_address_collection: "auto",

      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: "Digital Systems Assessment",
              description:
                "A focused strategy session to review your website, tools, and workflows with clear next steps.",
            },
            unit_amount: amountInCents,
          },
          quantity: 1,
        },
      ],

      success_url: `${siteUrl}/assessment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/assessment?canceled=1`,

      // Helps you track this later in Stripe
      metadata: {
        offer: "digital-systems-assessment",
        brand: "CEL3 Interactive",
        account: "CEL3 Media (DBA CEL3 Interactive)",
      },
    });

    return NextResponse.json({ ok: true, url: session.url }, { status: 200 });
  } catch {
    return NextResponse.json(
      { ok: false, message: "Unable to start checkout. Please try again." },
      { status: 500 }
    );
  }
}

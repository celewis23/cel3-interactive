import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { sanityServer } from "@/lib/sanityServer";
import { getHoopsAcceptance } from "@/lib/mockups/hoopsbasketballacademy/acceptance";
import { HOOPS_SELECTIONS, HOOPS_ONBOARDING_CHECKLIST } from "@/lib/mockups/hoopsbasketballacademy/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Read-only: the thank-you page polls this to show what was bought, without ever
// waiting on (or depending on) the back-office webhook having finished.
export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get("session_id");
  if (!sessionId) return NextResponse.json({ error: "Missing session_id" }, { status: 400 });

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.metadata?.proposalSlug !== "hoopsbasketballacademy") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const acceptanceId = session.metadata?.acceptanceId ?? null;
    const acceptance = acceptanceId ? await getHoopsAcceptance(acceptanceId) : null;
    const selection = acceptance ? HOOPS_SELECTIONS[acceptance.selectionId] : null;

    // The contract (and its PDF) are created asynchronously by the webhook, so this may
    // briefly be null right after redirect — the thank-you page just omits the download link then.
    const contract = acceptance
      ? await sanityServer.fetch<{ _id: string } | null>(
          `*[_type == "contract" && priceHash == $priceHash][0]{ _id }`,
          { priceHash: acceptance.priceHash }
        )
      : null;

    return NextResponse.json({
      paid: session.payment_status === "paid",
      selectionName: selection?.name ?? null,
      dueTodayCents: acceptance?.dueTodayCents ?? null,
      monthlyCents: acceptance?.monthlyCents ?? null,
      businessName: acceptance?.businessName ?? null,
      checklist: acceptance ? HOOPS_ONBOARDING_CHECKLIST[acceptance.selectionId] : [],
      pdf: contract && acceptance ? { contractId: contract._id, token: acceptance.priceHash } : null,
    });
  } catch (err) {
    console.error("HOOPS_PROPOSAL_SESSION_ERR:", err);
    return NextResponse.json({ error: "Could not look up this session." }, { status: 500 });
  }
}

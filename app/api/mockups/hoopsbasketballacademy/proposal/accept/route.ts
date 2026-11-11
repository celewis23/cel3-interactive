import { NextRequest, NextResponse } from "next/server";
import { withActivity } from "@/lib/audit/withActivity";
import { createHoopsAcceptance } from "@/lib/mockups/hoopsbasketballacademy/acceptance";
import { HoopsPricingError, quoteHoopsSelection, HOOPS_PROPOSAL_VERSION } from "@/lib/mockups/hoopsbasketballacademy/pricing";
import { hashHoopsAcceptance } from "@/lib/mockups/hoopsbasketballacademy/acceptanceHash";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function clientIp(req: NextRequest): string | null {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() ?? null;
  return req.headers.get("x-real-ip");
}

function requireString(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${field} is required`);
  return value.trim();
}

async function handleActivityPOST(req: NextRequest) {
  try {
    const body = await req.json();
    const quote = quoteHoopsSelection(body.selectionId, body.addOn);

    const businessName = requireString(body.businessName, "Business name");
    const contactName = requireString(body.contactName, "Contact name");
    const email = requireString(body.email, "Email").toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("A valid email address is required");
    const phone = requireString(body.phone, "Phone");
    const billingAddress = {
      line1: requireString(body.billingAddress?.line1, "Billing address"),
      city: requireString(body.billingAddress?.city, "City"),
      state: requireString(body.billingAddress?.state, "State"),
      postalCode: requireString(body.billingAddress?.postalCode, "Postal code"),
    };
    const signerName = requireString(body.signerName, "Signature (typed full name)");
    if (body.agreed !== true) throw new Error("You must agree to the terms to continue");

    const signedAt = new Date().toISOString();
    const priceHash = hashHoopsAcceptance({
      selectionId: quote.selectionId,
      addOn: quote.addOn,
      dueTodayCents: quote.dueTodayCents,
      monthlyCents: quote.monthlyCents,
      proposalVersion: HOOPS_PROPOSAL_VERSION,
    });

    const acceptance = await createHoopsAcceptance({
      businessName, contactName, email, phone, billingAddress,
      selectionId: quote.selectionId,
      addOnRequested: quote.addOn,
      dueTodayCents: quote.dueTodayCents,
      monthlyCents: quote.monthlyCents,
      signerName, agreed: true, signedAt,
      ip: clientIp(req),
      userAgent: req.headers.get("user-agent"),
      proposalVersion: HOOPS_PROPOSAL_VERSION,
      priceHash,
    });

    return NextResponse.json({
      acceptanceId: acceptance._id,
      dueTodayCents: quote.dueTodayCents,
      monthlyCents: quote.monthlyCents,
    }, { status: 201 });
  } catch (err) {
    if (err instanceof HoopsPricingError) return NextResponse.json({ error: err.message }, { status: 400 });
    if (err instanceof Error && !err.message.includes("fetch")) return NextResponse.json({ error: err.message }, { status: 400 });
    console.error("HOOPS_PROPOSAL_ACCEPT_ERR:", err);
    return NextResponse.json({ error: "Could not record your acceptance. Please try again." }, { status: 500 });
  }
}

export const POST = withActivity("/api/mockups/hoopsbasketballacademy/proposal/accept", "POST", handleActivityPOST);

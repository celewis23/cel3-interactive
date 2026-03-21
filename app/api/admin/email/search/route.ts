// GET /api/admin/email/search?q=xxx — search fitRequest records for linking
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken, COOKIE_NAME } from "@/lib/admin/auth";
import { sanityServer } from "@/lib/sanityServer";

function requireAuth(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return false;
  const session = verifySessionToken(token);
  return session?.step === "full";
}

export async function GET(req: NextRequest) {
  if (!requireAuth(req))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") ?? "").trim();
    if (q.length < 2) return NextResponse.json({ results: [] });

    // Search fitRequests by name or company (email field is an object so we can't search it)
    const results = await sanityServer.fetch(
      `*[_type == "fitRequest" && (
        name match $q ||
        company match $q ||
        threadKey == $exact
      )] | order(createdAt desc)[0...10] {
        _id,
        name,
        company,
        "recordType": "fitRequest",
        createdAt
      }`,
      { q: `${q}*`, exact: q.toUpperCase() }
    );

    // Also search bookings by customer name
    const bookingResults = await sanityServer.fetch(
      `*[_type == "assessmentBooking" && customerName match $q] | order(startsAtUtc desc)[0...5] {
        _id,
        "name": customerName,
        "company": customerEmail,
        "recordType": "assessmentBooking",
        "createdAt": startsAtUtc
      }`,
      { q: `${q}*` }
    );

    return NextResponse.json({ results: [...results, ...bookingResults] });
  } catch (err) {
    console.error("EMAIL_ERROR:", err);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}

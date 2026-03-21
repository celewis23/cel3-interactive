import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken, COOKIE_NAME } from "@/lib/admin/auth";
import { listSubscriptions } from "@/lib/stripe/billing";

export const runtime = "nodejs";

function requireAuth(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return false;
  const session = verifySessionToken(token);
  return session?.step === "full";
}

export async function GET(req: NextRequest) {
  if (!requireAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const customerId = searchParams.get("customerId") ?? undefined;
    const status = searchParams.get("status") ?? undefined;
    const limit = searchParams.get("limit") ? Number(searchParams.get("limit")) : undefined;
    const startingAfter = searchParams.get("startingAfter") ?? undefined;

    const result = await listSubscriptions({ customerId, status, limit, startingAfter });
    return NextResponse.json(result);
  } catch (err: unknown) {
    console.error("BILLING_ERROR:", err);
    return NextResponse.json({ error: "Failed to fetch subscriptions" }, { status: 500 });
  }
}

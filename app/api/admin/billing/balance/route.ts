import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken, COOKIE_NAME } from "@/lib/admin/auth";
import { getBalance, listPayouts } from "@/lib/stripe/billing";

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
    const [balance, payouts] = await Promise.all([
      getBalance(),
      listPayouts(10),
    ]);
    return NextResponse.json({ balance, payouts });
  } catch (err: unknown) {
    console.error("BILLING_ERROR:", err);
    return NextResponse.json({ error: "Failed to fetch balance" }, { status: 500 });
  }
}

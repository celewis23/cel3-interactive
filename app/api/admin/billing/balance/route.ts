import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/permissions";
import { getBalance, listPayouts } from "@/lib/stripe/billing";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const authErr = await requirePermission(req, "billing", "view");
  if (authErr) return authErr;

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

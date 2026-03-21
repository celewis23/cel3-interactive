import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken, COOKIE_NAME } from "@/lib/admin/auth";
import { voidInvoice } from "@/lib/stripe/billing";

export const runtime = "nodejs";

function requireAuth(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return false;
  const session = verifySessionToken(token);
  return session?.step === "full";
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!requireAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const invoice = await voidInvoice(id);
    return NextResponse.json({ ok: true, invoice });
  } catch (err: unknown) {
    console.error("BILLING_ERROR:", err);
    return NextResponse.json({ error: "Failed to void invoice" }, { status: 500 });
  }
}

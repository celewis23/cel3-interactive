import { NextRequest, NextResponse } from "next/server";
import { redeemPairing } from "@/lib/meterwise/deviceAuth";

export const runtime = "nodejs";
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (typeof body?.code !== "string" || typeof body?.verifier !== "string") {
    return NextResponse.json({ error: "Invalid connection" }, { status: 400 });
  }
  try {
    const token = await redeemPairing(body.code, body.verifier);
    if (!token) return NextResponse.json({ error: "This connection expired or was already used. Connect again from the app." }, { status: 401 });
    return NextResponse.json({ token }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Unable to connect. Please try again." }, { status: 503 });
  }
}

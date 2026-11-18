import { NextRequest, NextResponse } from "next/server";
import { COOKIE_NAME, verifySessionToken } from "@/lib/admin/auth";
import { createPairing } from "@/lib/meterwise/deviceAuth";

export const runtime = "nodejs";
export async function POST(req: NextRequest) {
  if (req.headers.get("origin") !== new URL(req.url).origin) {
    return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  }
  const cookie = req.cookies.get(COOKIE_NAME)?.value;
  const session = cookie ? verifySessionToken(cookie) : null;
  if (!session || session.step !== "full") return NextResponse.json({ error: "Sign in again" }, { status: 401 });
  const body = await req.json().catch(() => null);
  if (typeof body?.challenge !== "string" || !/^[a-f0-9]{64}$/.test(body.challenge)) {
    return NextResponse.json({ error: "Open this page from the Meterwise Android app" }, { status: 400 });
  }
  try {
    const code = await createPairing(session, body.challenge);
    if (!code) return NextResponse.json({ error: "Sign in again with Meterwise access" }, { status: 403 });
    return NextResponse.json({ code }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Could not connect this device" }, { status: 503 });
  }
}

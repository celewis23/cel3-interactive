import { NextRequest, NextResponse } from "next/server";
import { recordClick } from "@/lib/campaigns/db";

export const runtime = "nodejs";

export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const url = req.nextUrl.searchParams.get("url");
  if (!url) return NextResponse.redirect("/");

  // Record click fire-and-forget, then redirect immediately
  recordClick(token, url).catch(() => {});
  return NextResponse.redirect(url, { status: 302 });
}

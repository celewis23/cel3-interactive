import { withActivity } from "@/lib/audit/withActivity";
import { NextResponse } from "next/server";
import { sanityServer } from "@/lib/sanityServer";

export const runtime = "nodejs";

async function handleActivityPOST(req: Request) {
  const form = await req.formData();
  const key = String(form.get("key") || "");
  const bookingId = String(form.get("bookingId") || "");

  const adminKey = process.env.ADMIN_VIEW_KEY || "";
  if (!adminKey || key !== adminKey) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  if (!bookingId) {
    return NextResponse.json({ ok: false, message: "Missing bookingId" }, { status: 400 });
  }

  await sanityServer.patch(bookingId).set({ status: "CANCELED" }).commit();

  // redirect back to admin list (preserve key)
  return NextResponse.redirect(new URL(`/admin/bookings?key=${encodeURIComponent(key)}`, req.url));
}

export const POST = withActivity("/api/admin/cancel-booking", "POST", handleActivityPOST);

import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken, COOKIE_NAME } from "@/lib/admin/auth";
import { sanityWriteClient } from "@/lib/sanity.write";
import { sanityServer } from "@/lib/sanityServer";

export const runtime = "nodejs";

const DOC_ID = "siteSettings";

function requireAuth(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return false;
  const session = verifySessionToken(token);
  return session?.step === "full";
}

export async function GET(req: NextRequest) {
  if (!requireAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const doc = await sanityServer.fetch(`*[_id == "siteSettings"][0]`);
  return NextResponse.json(doc || {});
}

export async function PATCH(req: NextRequest) {
  if (!requireAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  // Upsert the singleton doc
  const existing = await sanityServer.fetch(`*[_id == "siteSettings"][0]{ _id }`);
  let result;
  if (existing) {
    result = await sanityWriteClient.patch(DOC_ID).set(body).commit();
  } else {
    result = await sanityWriteClient.createOrReplace({ _id: DOC_ID, _type: "siteSettings", ...body });
  }

  return NextResponse.json(result);
}

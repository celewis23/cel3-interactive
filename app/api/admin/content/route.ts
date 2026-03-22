import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/permissions";
import { sanityWriteClient } from "@/lib/sanity.write";
import { sanityServer } from "@/lib/sanityServer";

export const runtime = "nodejs";

const DOC_ID = "siteSettings";

export async function GET(req: NextRequest) {
  const authErr = await requirePermission(req, "settings", "view");
  if (authErr) return authErr;

  const doc = await sanityServer.fetch(`*[_id == "siteSettings"][0]`);
  return NextResponse.json(doc || {});
}

export async function PATCH(req: NextRequest) {
  const authErr = await requirePermission(req, "settings", "manage");
  if (authErr) return authErr;

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

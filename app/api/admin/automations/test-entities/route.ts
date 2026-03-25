export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/permissions";
import { sanityServer } from "@/lib/sanityServer";

const TYPE_QUERIES: Record<string, string> = {
  contract: `*[_type == "contract"] | order(_createdAt desc) [0...20] { _id, title, clientName }`,
  invoice:  `*[_type == "invoice"] | order(_createdAt desc) [0...20] { _id, number, clientName }`,
  contact:  `*[_type == "contact"] | order(_createdAt desc) [0...20] { _id, name }`,
  client:   `*[_type == "client"] | order(_createdAt desc) [0...20] { _id, name }`,
  pmProject:`*[_type == "pmProject"] | order(_createdAt desc) [0...20] { _id, name }`,
  pmTask:   `*[_type == "pmTask"] | order(_createdAt desc) [0...20] { _id, title }`,
};

export async function GET(req: NextRequest) {
  const authErr = await requirePermission(req, "automations", "view");
  if (authErr) return authErr;

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") ?? "";

  const query = TYPE_QUERIES[type];
  if (!query) {
    return NextResponse.json({ entities: [] });
  }

  try {
    const entities = await sanityServer.fetch(query);
    return NextResponse.json({ entities: entities ?? [] });
  } catch (err) {
    console.error("TEST_ENTITIES_ERR:", err);
    return NextResponse.json({ entities: [] });
  }
}

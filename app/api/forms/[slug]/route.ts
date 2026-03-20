import { NextRequest, NextResponse } from "next/server";
import { sanityServer } from "@/lib/sanityServer";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  // Never expose notification recipient data on the public endpoint
  const form = await sanityServer.fetch(
    `*[_type == "cel3Form" && slug == $slug][0]{ _id, title, description, slug, isPublic, isActive, fields }`,
    { slug }
  );

  if (!form) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(form);
}

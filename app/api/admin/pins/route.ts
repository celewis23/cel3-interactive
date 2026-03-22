export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { requirePermission, getSessionInfo } from "@/lib/admin/permissions";
import { sanityServer } from "@/lib/sanityServer";
import { sanityWriteClient } from "@/lib/sanity.write";

export async function GET(req: NextRequest) {
  const authErr = await requirePermission(req, "announcements", "view");
  if (authErr) return authErr;

  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category") ?? "";

  try {
    const filter = category
      ? `_type == "pin" && category == $category`
      : `_type == "pin"`;

    const pins = await sanityServer.fetch(
      `*[${filter}] | order(order asc, createdAt desc){
        _id, title, content, url, category, authorId, authorName, order, createdAt
      }`,
      { category }
    );

    return NextResponse.json(pins);
  } catch (err) {
    console.error("PINS_GET_ERR:", err);
    return NextResponse.json({ error: "Failed to fetch pins" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const authErr = await requirePermission(req, "announcements", "view");
  if (authErr) return authErr;

  try {
    const body = await req.json();
    const { title, content, url, category } = body;

    if (!title?.trim()) {
      return NextResponse.json({ error: "title is required" }, { status: 400 });
    }

    const session = getSessionInfo(req);
    const authorId = session?.staffId ?? null;

    let authorName = "Owner";
    if (authorId) {
      const staff = await sanityServer.fetch<{ name: string } | null>(
        `*[_type == "staffMember" && _id == $id][0]{ name }`,
        { id: authorId }
      );
      authorName = staff?.name ?? "Staff";
    }

    // Get max order for placement at end
    const maxOrder = await sanityServer.fetch<number>(
      `coalesce(max(*[_type == "pin"].order), 0)`
    );

    const pin = await sanityWriteClient.create({
      _type: "pin",
      title: title.trim(),
      content: content?.trim() ?? null,
      url: url?.trim() ?? null,
      category: category?.trim() || "General",
      authorId,
      authorName,
      order: (maxOrder ?? 0) + 1,
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json(pin, { status: 201 });
  } catch (err) {
    console.error("PINS_POST_ERR:", err);
    return NextResponse.json({ error: "Failed to create pin" }, { status: 500 });
  }
}

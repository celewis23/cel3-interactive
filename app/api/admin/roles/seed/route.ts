import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/permissions";
import { DEFAULT_ROLES } from "@/lib/admin/permissions";
import { sanityServer } from "@/lib/sanityServer";
import { sanityWriteClient } from "@/lib/sanity.write";

export const runtime = "nodejs";

/** POST /api/admin/roles/seed — seeds the 5 default roles (idempotent). */
export async function POST(req: NextRequest) {
  const authErr = await requirePermission(req, "staffManagement", "manage");
  if (authErr) return authErr;

  const existingSlugs = await sanityServer.fetch<string[]>(
    `*[_type == "staffRole"].slug`
  );
  const existing = new Set(existingSlugs);

  const results: string[] = [];
  for (const role of DEFAULT_ROLES) {
    if (existing.has(role.slug)) {
      results.push(`skipped: ${role.slug} (already exists)`);
      continue;
    }
    await sanityWriteClient.create({ _type: "staffRole", ...role });
    results.push(`created: ${role.slug}`);
  }

  return NextResponse.json({ ok: true, results });
}

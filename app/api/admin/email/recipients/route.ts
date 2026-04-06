export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/permissions";
import { searchContacts } from "@/lib/google/contacts";
import { sanityServer } from "@/lib/sanityServer";

type RecipientSuggestion = {
  email: string;
  label: string;
  sublabel?: string;
  source: "google" | "pipeline";
};

function dedupeSuggestions(items: RecipientSuggestion[]): RecipientSuggestion[] {
  const seen = new Set<string>();
  const next: RecipientSuggestion[] = [];

  for (const item of items) {
    const key = item.email.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    next.push(item);
  }

  return next;
}

export async function GET(req: NextRequest) {
  const authErr = await requirePermission(req, "email", "view");
  if (authErr) return authErr;

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) {
    return NextResponse.json({ suggestions: [] });
  }

  try {
    const [googleResults, pipelineResults] = await Promise.all([
      searchContacts(q).catch(() => []),
      sanityServer.fetch<
        Array<{ name?: string | null; email?: string | null; company?: string | null }>
      >(
        `*[_type == "pipelineContact" && (
          (defined(name) && lower(name) match $match) ||
          (defined(email) && lower(email) match $match) ||
          (defined(company) && lower(company) match $match)
        )][0...8]{
          name,
          email,
          company
        }`,
        { match: `*${q.toLowerCase()}*` }
      ).catch(() => []),
    ]);

    const googleSuggestions: RecipientSuggestion[] = googleResults.flatMap((contact) =>
      contact.emails
        .filter((entry) => !!entry.value)
        .map((entry) => ({
          email: entry.value,
          label: contact.displayName?.trim() || entry.value,
          sublabel: contact.organizations[0]?.name || undefined,
          source: "google" as const,
        }))
    );

    const pipelineSuggestions: RecipientSuggestion[] = pipelineResults
      .filter((contact) => !!contact.email)
      .map((contact) => ({
        email: contact.email!.trim(),
        label: contact.name?.trim() || contact.email!.trim(),
        sublabel: contact.company?.trim() || undefined,
        source: "pipeline" as const,
      }));

    const suggestions = dedupeSuggestions([
      ...googleSuggestions,
      ...pipelineSuggestions,
    ]).slice(0, 8);

    return NextResponse.json({ suggestions });
  } catch (err) {
    console.error("EMAIL_RECIPIENTS_ERROR:", err);
    return NextResponse.json({ suggestions: [] }, { status: 200 });
  }
}

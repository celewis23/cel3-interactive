import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/permissions";
import { sanityServer } from "@/lib/sanityServer";
import { FormField } from "@/lib/forms";

export const runtime = "nodejs";

function safeJson(s: string): Record<string, unknown> {
  try { return JSON.parse(s); } catch { return {}; }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authErr = await requirePermission(req, "forms", "view");
  if (authErr) return authErr;
  const { id } = await params;

  const [form, submissions] = await Promise.all([
    sanityServer.fetch<{ _id: string; title: string; fields: FormField[] } | null>(
      `*[_type == "cel3Form" && _id == $id][0]{ _id, title, fields }`,
      { id }
    ),
    sanityServer.fetch<Array<{ _id: string; submittedAt: string; ipAddress?: string; answersJson: string; filesJson: string }>>(
      `*[_type == "cel3FormSubmission" && formId == $id] | order(submittedAt desc)[0...500]`,
      { id }
    ),
  ]);

  if (!form) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (req.nextUrl.searchParams.get("format") === "csv") {
    const fields = (form.fields || []).filter(f => f.fieldType !== "section_header");
    const header = ["Submitted At", "IP Address", ...fields.map(f => f.label)];
    const rows = submissions.map(s => {
      const answers = safeJson(s.answersJson);
      return [
        s.submittedAt,
        s.ipAddress || "",
        ...fields.map(f => {
          const v = answers[f.id];
          return Array.isArray(v) ? v.join("; ") : String(v ?? "");
        }),
      ].map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(",");
    });
    const csv = [header.map(h => `"${h}"`).join(","), ...rows].join("\r\n");
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="submissions-${form.title.replace(/\s+/g, "-")}.csv"`,
      },
    });
  }

  return NextResponse.json({ form, submissions });
}

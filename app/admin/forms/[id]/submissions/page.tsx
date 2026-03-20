import { sanityServer } from "@/lib/sanityServer";
import { notFound } from "next/navigation";
import Link from "next/link";
import SubmissionsClient from "@/components/admin/forms/SubmissionsClient";
import { FormField, FormSubmission } from "@/lib/forms";

export const dynamic = "force-dynamic";

export default async function SubmissionsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [form, submissions] = await Promise.all([
    sanityServer.fetch<{ _id: string; title: string; fields: FormField[] } | null>(
      `*[_type == "cel3Form" && _id == $id][0]{ _id, title, fields }`,
      { id }
    ),
    sanityServer.fetch<FormSubmission[]>(
      `*[_type == "cel3FormSubmission" && formId == $id] | order(submittedAt desc)[0...500]`,
      { id }
    ),
  ]);

  if (!form) notFound();

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/forms" className="text-white/30 hover:text-white transition-colors text-sm">
          ← Forms
        </Link>
        <span className="text-white/20">/</span>
        <Link href={`/admin/forms/${id}/edit`} className="text-white/30 hover:text-white transition-colors text-sm">
          {form.title}
        </Link>
        <span className="text-white/20">/</span>
        <span className="text-sm text-white/50">Submissions</span>
      </div>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-white">{form.title}</h1>
          <p className="text-sm text-white/40 mt-1">{submissions.length} submission{submissions.length !== 1 ? "s" : ""}</p>
        </div>
        <a
          href={`/api/admin/forms/${id}/submissions?format=csv`}
          className="px-4 py-2 rounded-xl border border-white/10 hover:border-white/25 text-white/60 hover:text-white text-sm transition-colors"
        >
          Export CSV
        </a>
      </div>

      <SubmissionsClient form={form} submissions={submissions} />
    </div>
  );
}

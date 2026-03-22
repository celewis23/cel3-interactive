import { sanityServer } from "@/lib/sanityServer";
import { notFound } from "next/navigation";
import TemplateBuilder from "@/components/admin/onboarding/TemplateBuilder";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function EditOnboardingTemplatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const template = await sanityServer.fetch(
    `*[_type == "onboardingTemplate" && _id == $id][0]`,
    { id }
  ) as {
    _id: string;
    name: string;
    description: string | null;
    category: string;
    steps: Array<{
      _key: string;
      order: number;
      title: string;
      description: string | null;
      dueDateOffsetDays: number | null;
      actionType: string;
    }>;
  } | null;

  if (!template) notFound();

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs text-white/30 uppercase tracking-widest mb-1">
            <Link href="/admin/onboarding/templates" className="hover:text-white/60 transition-colors">
              Onboarding / Templates
            </Link>
          </div>
          <h1 className="text-2xl font-bold text-white">{template.name}</h1>
        </div>
        <Link
          href={`/admin/onboarding/new?templateId=${template._id}`}
          className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-sm font-medium transition-colors flex-shrink-0"
        >
          Use Template
        </Link>
      </div>
      <TemplateBuilder initial={template} />
    </div>
  );
}

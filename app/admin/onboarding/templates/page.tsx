import TemplatesLibrary from "@/components/admin/onboarding/TemplatesLibrary";
import { ensureDefaultOnboardingTemplates } from "@/lib/onboarding/defaultTemplates";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function OnboardingTemplatesPage() {
  const templates = await ensureDefaultOnboardingTemplates() as Array<{
    _id: string;
    name: string;
    description: string | null;
    category: string;
    steps: Array<{ _key: string }>;
    _createdAt: string;
  }>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs text-white/30 uppercase tracking-widest mb-1">Onboarding</div>
          <h1 className="text-2xl font-bold text-white">Templates</h1>
          <p className="text-sm text-white/40 mt-2">
            Stored onboarding checklist templates you can reuse, edit, or delete anytime.
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/admin/onboarding"
            className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-sm transition-colors"
          >
            Active Onboardings
          </Link>
          <Link
            href="/admin/onboarding/templates/new"
            className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-sm font-medium transition-colors"
          >
            New Template
          </Link>
        </div>
      </div>

      <TemplatesLibrary initialTemplates={templates} />
    </div>
  );
}

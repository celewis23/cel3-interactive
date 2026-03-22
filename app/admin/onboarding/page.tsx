import { sanityServer } from "@/lib/sanityServer";
import Link from "next/link";
import ChecklistList from "@/components/admin/onboarding/ChecklistList";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const instances = await sanityServer.fetch(
    `*[_type == "onboardingInstance"] | order(_createdAt desc) {
      _id, templateName, clientName, clientEmail, clientCompany,
      startDate, status, steps, _createdAt
    }`
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs text-white/30 uppercase tracking-widest mb-1">Backoffice</div>
          <h1 className="text-2xl font-bold text-white">Onboarding</h1>
        </div>
        <div className="flex gap-3">
          <Link
            href="/admin/onboarding/templates"
            className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-sm transition-colors"
          >
            Templates
          </Link>
          <Link
            href="/admin/onboarding/new"
            className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-sm font-medium transition-colors"
          >
            Start Onboarding
          </Link>
        </div>
      </div>
      <ChecklistList instances={instances} />
    </div>
  );
}

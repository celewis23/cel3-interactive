import { sanityServer } from "@/lib/sanityServer";
import { notFound } from "next/navigation";
import ChecklistDetail from "@/components/admin/onboarding/ChecklistDetail";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function OnboardingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const instance = await sanityServer.fetch(
    `*[_type == "onboardingInstance" && _id == $id][0]`,
    { id }
  ) as {
    _id: string;
    templateName: string | null;
    clientName: string;
    clientEmail: string | null;
    clientCompany: string | null;
    pipelineContactId: string | null;
    stripeCustomerId: string | null;
    portalUserId: string | null;
    startDate: string;
    status: string;
    steps: Array<{
      _key: string;
      order: number;
      title: string;
      description: string | null;
      dueDate: string | null;
      actionType: string;
      status: string;
      completedAt: string | null;
      notes: string | null;
    }>;
    notes: string | null;
  } | null;

  if (!instance) notFound();

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <div className="text-xs text-white/30 uppercase tracking-widest mb-1">
            <Link href="/admin/onboarding" className="hover:text-white/60 transition-colors">
              Onboarding
            </Link>
          </div>
          <h1 className="text-2xl font-bold text-white">{instance.clientName}</h1>
        </div>
      </div>
      <ChecklistDetail instance={instance} />
    </div>
  );
}

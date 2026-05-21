import { getCampaignById } from "@/lib/campaigns/db";
import { notFound } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function PortalCampaignPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const campaign = await getCampaignById(id);
  if (!campaign || campaign.status !== "sent") notFound();

  const sentDate = campaign.sentAt
    ? new Date(campaign.sentAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    : null;

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-6">
      <div>
        <Link href="/portal" className="text-xs text-white/40 hover:text-white/70 transition-colors">
          ← Back to Dashboard
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-white">{campaign.subject}</h1>
        {sentDate && <p className="text-sm text-white/40 mt-1">{sentDate} · CEL3 Interactive</p>}
      </div>

      <div
        className="prose prose-invert max-w-none text-white/80 leading-relaxed
          [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-white [&_h2]:mt-6 [&_h2]:mb-3
          [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-white [&_h3]:mt-4 [&_h3]:mb-2
          [&_a]:text-sky-400 [&_a]:underline [&_a:hover]:text-sky-300
          [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:my-3
          [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:my-3
          [&_p]:my-3
          [&_img]:max-w-full [&_img]:rounded-xl [&_img]:my-4"
        dangerouslySetInnerHTML={{ __html: campaign.bodyHtml }}
      />
    </div>
  );
}

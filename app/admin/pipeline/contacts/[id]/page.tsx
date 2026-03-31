import { cookies } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { verifySessionToken, COOKIE_NAME } from "@/lib/admin/auth";
import { sanityServer } from "@/lib/sanityServer";
import ContactDetailClient from "@/components/admin/pipeline/ContactDetailClient";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Stage = { id: string; name: string };

type PipelineContact = {
  _id: string;
  _type: string;
  _createdAt: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  source: string | null;
  notes: string | null;
  owner: string | null;
  stage: string;
  stageEnteredAt: string;
  estimatedValue: number | null;
  stripeCustomerId: string | null;
  googleContactResourceName: string | null;
  closedAt: string | null;
  driveFileUrl: string | null;
  driveFileName: string | null;
  followUpEventId: string | null;
  siteUrl: string | null;
  managementUrl: string | null;
  managementUsername: string | null;
};

type PipelineActivity = {
  _id: string;
  _createdAt: string;
  contactId: string;
  type: "created" | "note" | "stage_change" | "converted" | "follow_up";
  text: string | null;
  fromStage: string | null;
  toStage: string | null;
  author: string;
};

const DEFAULT_STAGES: Stage[] = [
  { id: "new-lead", name: "New Lead" },
  { id: "contacted", name: "Contacted" },
  { id: "proposal", name: "Proposal Sent" },
  { id: "negotiating", name: "Negotiating" },
  { id: "won", name: "Won" },
  { id: "lost", name: "Lost" },
];

export default async function ContactDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const session = token ? verifySessionToken(token) : null;
  if (!session || session.step !== "full") redirect("/admin/login");

  const { id } = await params;

  const [contact, configRaw, activity] = await Promise.all([
    sanityServer.fetch<PipelineContact | null>(
      `*[_type == "pipelineContact" && _id == $id][0] {
        _id, _type, _createdAt,
        name, email, phone, company, source, notes, owner,
        stage, stageEnteredAt, estimatedValue, stripeCustomerId, googleContactResourceName,
        closedAt, driveFileUrl, driveFileName, followUpEventId,
        siteUrl, managementUrl, managementUsername
      }`,
      { id }
    ),
    sanityServer.fetch<{ stages: Stage[] } | null>(
      `*[_type == "pipelineConfig" && _id == "pipeline-config"][0]{ stages }`
    ),
    sanityServer.fetch<PipelineActivity[]>(
      `*[_type == "pipelineActivity" && contactId == $id] | order(_createdAt asc) {
        _id, _createdAt, contactId, type, text, fromStage, toStage, author
      }`,
      { id }
    ),
  ]);

  if (!contact) notFound();

  const stages = configRaw?.stages ?? DEFAULT_STAGES;

  return (
    <ContactDetailClient
      contact={contact}
      stages={stages}
      initialActivity={activity}
    />
  );
}

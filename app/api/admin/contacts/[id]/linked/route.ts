export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/permissions";
import { getContact } from "@/lib/google/contacts";
import { sanityServer } from "@/lib/sanityServer";

const DEFAULT_STAGES = [
  { id: "new-lead", name: "New Lead" },
  { id: "contacted", name: "Contacted" },
  { id: "proposal", name: "Proposal Sent" },
  { id: "negotiating", name: "Negotiating" },
  { id: "won", name: "Won" },
  { id: "lost", name: "Lost" },
];

type LinkedPipelineContact = {
  _id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  source: string | null;
  notes: string | null;
  owner: string | null;
  stage: string;
  estimatedValue: number | null;
  stripeCustomerId: string | null;
  googleContactResourceName: string | null;
  siteUrl: string | null;
  managementUrl: string | null;
  managementUsername: string | null;
};

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authErr = await requirePermission(req, "clients", "view");
  if (authErr) return authErr;

  try {
    const { id } = await params;
    const resourceName = `people/${id}`;
    const googleContact = await getContact(resourceName);

    if (!googleContact) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    const email = googleContact.emails[0]?.value ?? null;

    const [pipelineContact, configRaw] = await Promise.all([
      sanityServer.fetch<LinkedPipelineContact | null>(
        `*[
          _type == "pipelineContact" &&
          (
            googleContactResourceName == $resourceName ||
            (defined(email) && lower(email) == lower($email))
          )
        ][0]{
          _id, name, email, phone, company, source, notes, owner,
          stage, estimatedValue, stripeCustomerId, googleContactResourceName,
          siteUrl, managementUrl, managementUsername
        }`,
        { resourceName, email }
      ),
      sanityServer.fetch<{ stages: Array<{ id: string; name: string }> } | null>(
        `*[_type == "pipelineConfig" && _id == "pipeline-config"][0]{ stages }`
      ),
    ]);

    return NextResponse.json({
      pipelineContact,
      stages: configRaw?.stages ?? DEFAULT_STAGES,
    });
  } catch (err) {
    console.error("CONTACTS_LINKED_LOOKUP_ERROR:", err);
    return NextResponse.json({ error: "Failed to load linked contact details" }, { status: 500 });
  }
}

import { randomUUID } from "crypto";
import { sanityServer } from "@/lib/sanityServer";
import { sanityWriteClient } from "@/lib/sanity.write";
import { sendEmail } from "@/lib/gmail/api";
import { syncContactProfileFromPipeline } from "@/lib/contacts/unifiedSync";
import { getSelectedPlatformFeatures } from "./catalog";
import { recommendPlatformPackage } from "./pricing";
import { generatePlatformProposalPdf } from "./proposalPdf";
import type {
  PlatformBuilderResult,
  PlatformBuilderSubmission,
  PlatformContactInput,
  PlatformRecommendation,
} from "./types";

export type PlatformBuilderLead = {
  _id: string;
  _createdAt: string;
  status: PlatformBuilderLeadStatus;
  firstName: string;
  lastName: string;
  businessName: string;
  email: string;
  phone: string;
  budgetComfortRange: string;
  desiredTimeline: string;
  projectNotes: string;
  website?: string | null;
  businessType?: string | null;
  preferredContactMethod?: string | null;
  source: string;
  selectedFeatures: Array<{
    id: string;
    title: string;
    section: string;
    description: string;
    benefit: string;
  }>;
  featureCount: number;
  recommendation: PlatformRecommendation;
  proposal: {
    id: string;
    fileName: string;
    token: string;
    pdfBase64: string;
    generatedAt: string;
    clientEmailStatus?: string;
    adminEmailStatus?: string;
  };
  pipelineContactId?: string | null;
  fullSnapshot: unknown;
};

export type PlatformBuilderLeadStatus =
  | "new"
  | "contacted"
  | "discovery-scheduled"
  | "proposal-reviewed"
  | "won"
  | "lost";

const REQUIRED_CONTACT_FIELDS: Array<keyof PlatformContactInput> = [
  "firstName",
  "lastName",
  "businessName",
  "email",
  "phone",
  "budgetComfortRange",
  "desiredTimeline",
  "projectNotes",
];

export async function submitPlatformBuilderLead(input: PlatformBuilderSubmission, origin: string): Promise<PlatformBuilderResult> {
  const contact = normalizeContact(input.contact);
  const selectedFeatures = getSelectedPlatformFeatures(input.selectedFeatureIds);
  if (selectedFeatures.length === 0) {
    throw new PlatformBuilderValidationError("Select at least one platform feature.");
  }

  const recommendation = recommendPlatformPackage(selectedFeatures);
  const now = new Date().toISOString();
  const leadId = `platform-builder-${randomUUID()}`;
  const proposalId = `CEL3-${new Date().getFullYear()}-${randomUUID().slice(0, 8).toUpperCase()}`;
  const proposalToken = randomUUID();
  const proposalFileName = `CEL3-Platform-Proposal-${safeFileName(contact.businessName)}.pdf`;
  const pdf = generatePlatformProposalPdf({
    proposalId,
    contact,
    features: selectedFeatures,
    recommendation,
    generatedAt: now,
  });

  const selectedFeatureRecords = selectedFeatures.map((feature) => ({
    id: feature.id,
    title: feature.title,
    section: feature.section,
    description: feature.description,
    benefit: feature.benefit,
  }));

  const pipelineContact = await createPipelineContact(contact, recommendation, selectedFeatureRecords, now).catch((err) => {
    console.error("PLATFORM_BUILDER_PIPELINE_CREATE_ERR:", err);
    return null;
  });

  const proposal = {
    id: proposalId,
    fileName: proposalFileName,
    token: proposalToken,
    pdfBase64: pdf.toString("base64"),
    generatedAt: now,
    clientEmailStatus: "pending",
    adminEmailStatus: "pending",
  };

  await sanityWriteClient.create({
    _id: leadId,
    _type: "platformBuilderLead",
    status: "new",
    firstName: contact.firstName,
    lastName: contact.lastName,
    businessName: contact.businessName,
    email: contact.email,
    phone: contact.phone,
    budgetComfortRange: contact.budgetComfortRange,
    desiredTimeline: contact.desiredTimeline,
    projectNotes: contact.projectNotes,
    website: contact.website || null,
    businessType: contact.businessType || null,
    preferredContactMethod: contact.preferredContactMethod || null,
    source: "Build Your Platform",
    selectedFeatures: selectedFeatureRecords,
    featureCount: selectedFeatureRecords.length,
    recommendation,
    priorityScore: recommendation.priorityScore,
    proposal,
    pipelineContactId: pipelineContact?._id ?? null,
    fullSnapshot: {
      selectedFeatureIds: selectedFeatures.map((feature) => feature.id),
      contact,
      selectedFeatures: selectedFeatureRecords,
      recommendation,
      submittedAt: now,
    },
  });

  const downloadUrl = `/api/leads/platform-builder/${leadId}/proposal?token=${proposalToken}`;
  const emailStatus = await sendProposalEmails({
    contact,
    recommendation,
    featureCount: selectedFeatureRecords.length,
    leadId,
    proposalId,
    proposalFileName,
    pdf,
    downloadUrl: absoluteUrl(origin, downloadUrl),
    pipelineContactId: pipelineContact?._id ?? null,
  });

  await sanityWriteClient.patch(leadId).set({
    "proposal.clientEmailStatus": emailStatus.client,
    "proposal.adminEmailStatus": emailStatus.admin,
  }).commit();

  return {
    leadId,
    proposalId,
    recommendedPackage: recommendation.packageName,
    setupInvestmentRange: recommendation.setupInvestmentRange,
    monthlyInvestmentRange: recommendation.monthlyInvestmentRange,
    timelineEstimate: recommendation.timelineEstimate,
    aiUsageRecommendation: recommendation.aiUsageRecommendation,
    customConsultationRequired: recommendation.customConsultationRequired,
    featureCount: selectedFeatureRecords.length,
    proposalDownloadUrl: downloadUrl,
    emailStatus: emailStatus.overall,
  };
}

export async function getPlatformBuilderLeadForProposal(id: string, token: string) {
  return sanityServer.fetch<PlatformBuilderLead | null>(
    `*[_type == "platformBuilderLead" && _id == $id && proposal.token == $proposalToken][0]`,
    { id, proposalToken: token },
  );
}

export async function listPlatformBuilderLeads() {
  return sanityServer.fetch<PlatformBuilderLead[]>(
    `*[_type == "platformBuilderLead"] | order(_createdAt desc) {
      _id, _createdAt, status, firstName, lastName, businessName, email, phone,
      budgetComfortRange, desiredTimeline, projectNotes, website, businessType,
      preferredContactMethod, source, selectedFeatures, featureCount, recommendation,
      proposal { id, fileName, token, generatedAt, clientEmailStatus, adminEmailStatus },
      pipelineContactId, fullSnapshot
    }`,
  );
}

export async function updatePlatformBuilderLeadStatus(id: string, status: PlatformBuilderLeadStatus) {
  const allowed: PlatformBuilderLeadStatus[] = ["new", "contacted", "discovery-scheduled", "proposal-reviewed", "won", "lost"];
  if (!allowed.includes(status)) {
    throw new PlatformBuilderValidationError("Invalid lead status.");
  }
  return sanityWriteClient.patch(id).set({ status }).commit();
}

function normalizeContact(input: PlatformContactInput): PlatformContactInput {
  const normalized: PlatformContactInput = {
    firstName: input.firstName?.trim() ?? "",
    lastName: input.lastName?.trim() ?? "",
    businessName: input.businessName?.trim() ?? "",
    email: input.email?.trim().toLowerCase() ?? "",
    phone: input.phone?.trim() ?? "",
    budgetComfortRange: input.budgetComfortRange?.trim() ?? "",
    desiredTimeline: input.desiredTimeline?.trim() ?? "",
    projectNotes: input.projectNotes?.trim() ?? "",
    website: input.website?.trim() ?? "",
    businessType: input.businessType?.trim() ?? "",
    preferredContactMethod: input.preferredContactMethod?.trim() ?? "",
  };

  for (const field of REQUIRED_CONTACT_FIELDS) {
    if (!normalized[field]) {
      throw new PlatformBuilderValidationError(`${label(field)} is required.`);
    }
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized.email)) {
    throw new PlatformBuilderValidationError("A valid email address is required.");
  }
  return normalized;
}

async function createPipelineContact(
  contact: PlatformContactInput,
  recommendation: PlatformRecommendation,
  selectedFeatures: Array<{ title: string; section: string }>,
  now: string,
) {
  const fullName = `${contact.firstName} ${contact.lastName}`.trim();
  const notes = [
    "Source: Build Your Platform",
    `Recommended package: ${recommendation.packageName}`,
    `Setup investment range: ${recommendation.setupInvestmentRange}`,
    `Monthly investment range: ${recommendation.monthlyInvestmentRange}`,
    `Timeline estimate: ${recommendation.timelineEstimate}`,
    `Budget comfort range: ${contact.budgetComfortRange}`,
    `Desired timeline: ${contact.desiredTimeline}`,
    contact.businessType ? `Business type: ${contact.businessType}` : null,
    contact.website ? `Website: ${contact.website}` : null,
    "",
    "Selected features:",
    ...selectedFeatures.map((feature) => `- ${feature.title} (${feature.section})`),
    "",
    `Project notes: ${contact.projectNotes}`,
  ].filter(Boolean).join("\n");

  const pipelineContact = await sanityWriteClient.create({
    _type: "pipelineContact",
    name: fullName,
    email: contact.email,
    phone: contact.phone,
    company: contact.businessName,
    source: "Build Your Platform",
    notes,
    owner: null,
    stage: "new-lead",
    stageEnteredAt: now,
    estimatedValue: recommendation.estimatedValue,
    stripeCustomerId: null,
    googleContactResourceName: null,
    closedAt: null,
    driveFileUrl: null,
    driveFileName: null,
    followUpEventId: null,
    siteUrl: contact.website || null,
    managementUrl: null,
    managementUsername: null,
    managementPasswordEncrypted: null,
    managementPasswordIv: null,
    portalSiteUrl: null,
    portalManagementUrl: null,
    portalManagementUsername: null,
    portalManagementPasswordEncrypted: null,
    portalManagementPasswordIv: null,
  });

  await sanityWriteClient.create({
    _type: "pipelineActivity",
    contactId: pipelineContact._id,
    type: "created",
    text: "Created from Build Your Platform submission",
    fromStage: null,
    toStage: "new-lead",
    author: "Build Your Platform",
  });

  await syncContactProfileFromPipeline(pipelineContact._id).catch((err) => {
    console.error("PLATFORM_BUILDER_CONTACT_SYNC_ERR:", err);
  });

  return pipelineContact;
}

async function sendProposalEmails(input: {
  contact: PlatformContactInput;
  recommendation: PlatformRecommendation;
  featureCount: number;
  leadId: string;
  proposalId: string;
  proposalFileName: string;
  pdf: Buffer;
  downloadUrl: string;
  pipelineContactId: string | null;
}) {
  const clientHtml = `
    <p>Hi ${escapeHtml(input.contact.firstName)},</p>
    <p>Your CEL3 Interactive platform proposal is ready. It includes your recommended package, investment ranges, timeline estimate, selected features, and suggested next steps.</p>
    <p><strong>Recommended platform:</strong> ${escapeHtml(input.recommendation.packageName)}</p>
    <p><a href="${escapeHtml(input.downloadUrl)}">Download your proposal</a></p>
    <p>Pricing is an estimate based on the platform builder selections. Final scope is confirmed after discovery and technical review.</p>
    <p>CEL3 Interactive</p>
  `;

  const adminUrl = input.pipelineContactId
    ? `/admin/pipeline/contacts/${input.pipelineContactId}`
    : `/admin/leads/platform-builder`;
  const adminHtml = `
    <p>New Build Your Platform lead submitted.</p>
    <ul>
      <li>Client: ${escapeHtml(input.contact.firstName)} ${escapeHtml(input.contact.lastName)}</li>
      <li>Business: ${escapeHtml(input.contact.businessName)}</li>
      <li>Email: ${escapeHtml(input.contact.email)}</li>
      <li>Phone: ${escapeHtml(input.contact.phone)}</li>
      <li>Recommended package: ${escapeHtml(input.recommendation.packageName)}</li>
      <li>Estimated value: $${input.recommendation.estimatedValue.toLocaleString()}</li>
      <li>Selected feature count: ${input.featureCount}</li>
      <li>Lead record: ${escapeHtml(adminUrl)}</li>
    </ul>
  `;

  const attachment = {
    filename: input.proposalFileName,
    mimeType: "application/pdf",
    data: input.pdf,
  };

  const statuses = { client: "failed", admin: "failed" };

  await sendEmail({
    to: input.contact.email,
    subject: "Your CEL3 Interactive Platform Proposal",
    htmlBody: clientHtml,
    attachments: [attachment],
  }).then(() => {
    statuses.client = "sent";
  }).catch((err) => {
    console.error("PLATFORM_BUILDER_CLIENT_EMAIL_ERR:", err);
  });

  const adminEmail = process.env.PLATFORM_BUILDER_ADMIN_EMAIL || process.env.ADMIN_USERNAME;
  if (adminEmail && adminEmail.includes("@")) {
    await sendEmail({
      to: adminEmail,
      subject: "New Build Your Platform Lead",
      htmlBody: adminHtml,
      attachments: [attachment],
    }).then(() => {
      statuses.admin = "sent";
    }).catch((err) => {
      console.error("PLATFORM_BUILDER_ADMIN_EMAIL_ERR:", err);
    });
  }

  return {
    ...statuses,
    overall: statuses.client === "sent" && statuses.admin === "sent"
      ? "sent" as const
      : statuses.client === "sent" || statuses.admin === "sent"
        ? "partial" as const
        : "failed" as const,
  };
}

function safeFileName(value: string) {
  return value.replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "") || "Business";
}

function absoluteUrl(origin: string, path: string) {
  const base = origin || process.env.NEXT_PUBLIC_SITE_URL || "https://cel3interactive.com";
  return new URL(path, base).toString();
}

function label(field: string) {
  return field.replace(/([A-Z])/g, " $1").replace(/^./, (char) => char.toUpperCase());
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export class PlatformBuilderValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PlatformBuilderValidationError";
  }
}

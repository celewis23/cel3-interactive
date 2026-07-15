import { randomUUID } from "crypto";
import { sanityServer } from "@/lib/sanityServer";
import { sanityWriteClient } from "@/lib/sanity.write";
import { syncContactProfileFromPipeline } from "@/lib/contacts/unifiedSync";
import { sendEmail } from "@/lib/gmail/api";
import { researchedSeedLeads } from "./researchedSeedLeads";
import {
  DEFAULT_LEAD_GENERATOR_SETTINGS,
  LEAD_GENERATOR_SETTINGS_ID,
} from "./schedule";
import type {
  LeadCandidate,
  LeadCandidateInput,
  LeadCandidateStatus,
  LeadGeneratorSettings,
} from "./types";

const LEAD_FIELDS = `{
  _id, _type, _createdAt,
  businessName, niche, city, region, address, phone, email, emails, contactUrl, website,
  sourceUrl, status, openStatus, fitScore, leadSource, currentSnapshot,
  gapAssessment, howCel3CanHelp, emailSubject, emailBodyHtml, notes,
  reviewedAt, approvedPipelineContactId, emailedAt
}`;

const MIN_LEADS_PER_RUN = 20;
const DEFAULT_LEADS_PER_RUN = DEFAULT_LEAD_GENERATOR_SETTINGS.maxPerRun;
const MAX_LEADS_PER_RUN = 250;

function candidateId(input: LeadCandidateInput) {
  if (input._id) return input._id;
  return `lead-candidate-${randomUUID()}`;
}

function normalizeCandidate(input: LeadCandidateInput) {
  const primaryEmail = input.email?.trim().toLowerCase() || null;
  const allEmails = Array.from(
    new Set(
      [primaryEmail, ...(input.emails ?? [])]
        .map((e) => e?.trim().toLowerCase() || "")
        .filter(Boolean)
    )
  );

  return {
    _id: candidateId(input),
    _type: "leadCandidate",
    businessName: input.businessName.trim(),
    niche: input.niche.trim(),
    city: input.city.trim(),
    region: input.region,
    address: input.address?.trim() || null,
    phone: input.phone?.trim() || null,
    email: primaryEmail ?? allEmails[0] ?? null,
    emails: allEmails.length ? allEmails : null,
    contactUrl: input.contactUrl?.trim() || null,
    website: input.website?.trim() || null,
    sourceUrl: input.sourceUrl.trim(),
    status: input.status ?? "review",
    openStatus: input.openStatus ?? "open",
    fitScore: Math.min(Math.max(Number(input.fitScore ?? 50), 0), 100),
    leadSource: input.leadSource || "Lead generator",
    currentSnapshot: input.currentSnapshot.trim(),
    gapAssessment: input.gapAssessment.trim(),
    howCel3CanHelp: input.howCel3CanHelp.trim(),
    emailSubject: input.emailSubject.trim(),
    emailBodyHtml: input.emailBodyHtml.trim(),
    notes: input.notes?.trim() || null,
    reviewedAt: input.reviewedAt ?? null,
    approvedPipelineContactId: input.approvedPipelineContactId ?? null,
    emailedAt: input.emailedAt ?? null,
  };
}

function normalizeMaxPerRun(value: unknown, opts: { promoteLegacyDefault?: boolean } = {}) {
  const parsed = Number(value);
  const fallback = DEFAULT_LEADS_PER_RUN;
  const next = Number.isFinite(parsed) ? parsed : fallback;
  const promoted = opts.promoteLegacyDefault && next <= MIN_LEADS_PER_RUN ? fallback : next;
  return Math.min(Math.max(promoted, MIN_LEADS_PER_RUN), MAX_LEADS_PER_RUN);
}

function normalizeSearchList(value: unknown, fallback: string[], opts: { allowEmpty?: boolean } = {}) {
  if (!Array.isArray(value)) return fallback;
  const next = Array.from(new Set(
    value
      .map((item) => typeof item === "string" ? item.trim() : "")
      .filter(Boolean)
  ));
  if (opts.allowEmpty) return next;
  return next.length ? next : fallback;
}

export async function listLeadCandidates(status?: LeadCandidateStatus | "all") {
  const statusFilter = status && status !== "all" ? "&& status == $status" : "";
  return sanityServer.fetch<LeadCandidate[]>(
    `*[_type == "leadCandidate" ${statusFilter}] | order(_createdAt desc) ${LEAD_FIELDS}`,
    statusFilter ? { status } : {}
  );
}

export async function getLeadCandidate(id: string) {
  return sanityServer.fetch<LeadCandidate | null>(
    `*[_type == "leadCandidate" && _id == $id][0] ${LEAD_FIELDS}`,
    { id }
  );
}

export async function upsertLeadCandidate(input: LeadCandidateInput) {
  const doc = normalizeCandidate(input);
  await sanityWriteClient.createIfNotExists(doc);
  await sanityWriteClient.patch(doc._id).set(doc).commit();
  return getLeadCandidate(doc._id);
}

export async function updateLeadCandidate(id: string, patch: Partial<LeadCandidate>) {
  const allowed: Partial<LeadCandidate> = {};
  const keys: Array<keyof LeadCandidate> = [
    "businessName",
    "niche",
    "city",
    "region",
    "address",
    "phone",
    "email",
    "emails",
    "contactUrl",
    "website",
    "sourceUrl",
    "status",
    "openStatus",
    "fitScore",
    "currentSnapshot",
    "gapAssessment",
    "howCel3CanHelp",
    "emailSubject",
    "emailBodyHtml",
    "notes",
    "reviewedAt",
    "approvedPipelineContactId",
    "emailedAt",
  ];
  for (const key of keys) {
    if (key in patch) {
      (allowed as Record<string, unknown>)[key] = patch[key];
    }
  }
  await sanityWriteClient.patch(id).set(allowed).commit();
  return getLeadCandidate(id);
}

export async function seedResearchedLeadCandidates() {
  const results = [];
  for (const lead of researchedSeedLeads) {
    results.push(await upsertLeadCandidate(lead));
  }
  return results.filter(Boolean) as LeadCandidate[];
}

export async function getLeadGeneratorSettings() {
  const settings = await sanityServer.getDocument<LeadGeneratorSettings>(LEAD_GENERATOR_SETTINGS_ID).catch(() => null);
  const next = settings ?? DEFAULT_LEAD_GENERATOR_SETTINGS;
  return {
    ...DEFAULT_LEAD_GENERATOR_SETTINGS,
    ...next,
    maxPerRun: normalizeMaxPerRun(next.maxPerRun, { promoteLegacyDefault: true }),
    searchLocations: normalizeSearchList(next.searchLocations, DEFAULT_LEAD_GENERATOR_SETTINGS.searchLocations),
    searchCategories: normalizeSearchList(next.searchCategories, DEFAULT_LEAD_GENERATOR_SETTINGS.searchCategories, {
      allowEmpty: true,
    }),
  };
}

export async function updateLeadGeneratorSettings(patch: Partial<LeadGeneratorSettings>) {
  const current = await getLeadGeneratorSettings();
  const next: LeadGeneratorSettings = {
    ...DEFAULT_LEAD_GENERATOR_SETTINGS,
    ...current,
    enabled: typeof patch.enabled === "boolean" ? patch.enabled : current.enabled,
    frequency: patch.frequency ?? current.frequency,
    dayOfWeek: Number.isFinite(Number(patch.dayOfWeek)) ? Number(patch.dayOfWeek) : current.dayOfWeek,
    dayOfMonth: Number.isFinite(Number(patch.dayOfMonth)) ? Number(patch.dayOfMonth) : current.dayOfMonth,
    time: patch.time ?? current.time,
    timezone: patch.timezone ?? current.timezone,
    maxPerRun: normalizeMaxPerRun(
      Number.isFinite(Number(patch.maxPerRun)) ? patch.maxPerRun : current.maxPerRun
    ),
    searchLocations: normalizeSearchList(patch.searchLocations, current.searchLocations),
    searchCategories: normalizeSearchList(patch.searchCategories, current.searchCategories, { allowEmpty: true }),
    lastRunAt: patch.lastRunAt ?? current.lastRunAt,
    lastRunStatus: patch.lastRunStatus ?? current.lastRunStatus,
    lastRunMessage: patch.lastRunMessage ?? current.lastRunMessage,
  };

  await sanityWriteClient.createOrReplace(next);
  return next;
}

function buildLeadNotes(lead: LeadCandidate) {
  return [
    `Lead source: ${lead.leadSource}`,
    `Niche: ${lead.niche}`,
    `City/region: ${lead.city} / ${lead.region}`,
    lead.website ? `Website: ${lead.website}` : null,
    lead.contactUrl ? `Contact URL: ${lead.contactUrl}` : null,
    `Source URL: ${lead.sourceUrl}`,
    "",
    `Current snapshot: ${lead.currentSnapshot}`,
    `Gap assessment: ${lead.gapAssessment}`,
    `How CEL3 can help: ${lead.howCel3CanHelp}`,
    lead.notes ? `Notes: ${lead.notes}` : null,
  ].filter(Boolean).join("\n");
}

export async function approveLeadCandidate(id: string) {
  const lead = await getLeadCandidate(id);
  if (!lead) throw new Error("Lead candidate not found");

  if (lead.approvedPipelineContactId) {
    return { lead, contactId: lead.approvedPipelineContactId };
  }

  const now = new Date().toISOString();
  const contact = await sanityWriteClient.create({
    _type: "pipelineContact",
    name: lead.businessName,
    email: lead.email,
    phone: lead.phone,
    company: lead.businessName,
    source: "Lead Generator",
    notes: buildLeadNotes(lead),
    owner: null,
    stage: "new-lead",
    stageEnteredAt: now,
    estimatedValue: null,
    stripeCustomerId: null,
    googleContactResourceName: null,
    closedAt: null,
    driveFileUrl: null,
    driveFileName: null,
    followUpEventId: null,
    siteUrl: lead.website,
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
    contactId: contact._id,
    type: "created",
    text: `Approved from lead generator review queue`,
    fromStage: null,
    toStage: "new-lead",
    author: "Admin",
  });

  await syncContactProfileFromPipeline(contact._id).catch((err) => {
    console.error("LEAD_GENERATOR_APPROVE_SYNC_ERR:", err);
  });

  const updated = await updateLeadCandidate(id, {
    status: "approved",
    reviewedAt: now,
    approvedPipelineContactId: contact._id,
  } as Partial<LeadCandidate>);

  return { lead: updated ?? lead, contactId: contact._id };
}

export async function sendLeadCandidateEmail(id: string, opts?: { subject?: string; htmlBody?: string }) {
  const lead = await getLeadCandidate(id);
  if (!lead) throw new Error("Lead candidate not found");
  if (!lead.email) throw new Error("This lead does not have a public email address. Use the contact form link instead.");

  const subject = opts?.subject?.trim() || lead.emailSubject;
  const htmlBody = opts?.htmlBody?.trim() || lead.emailBodyHtml;
  if (!subject || !htmlBody) throw new Error("Email subject and body are required.");

  // CC the other discovered addresses (capped so cold email doesn't read as a blast)
  const primary = lead.email.toLowerCase();
  const ccList = (lead.emails ?? [])
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e && e !== primary)
    .slice(0, 3);

  const result = await sendEmail({
    to: lead.email,
    cc: ccList.length ? ccList.join(", ") : undefined,
    subject,
    htmlBody,
  });

  const now = new Date().toISOString();
  await updateLeadCandidate(id, {
    status: "sent",
    emailSubject: subject,
    emailBodyHtml: htmlBody,
    emailedAt: now,
  } as Partial<LeadCandidate>);

  return result;
}

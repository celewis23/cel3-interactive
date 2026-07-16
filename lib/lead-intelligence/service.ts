import { randomUUID } from "crypto";
import { sanityServer } from "@/lib/sanityServer";
import { sanityWriteClient } from "@/lib/sanity.write";
import { syncContactProfileFromPipeline } from "@/lib/contacts/unifiedSync";
import { sendEmail } from "@/lib/gmail/api";
import { buildOutreachEmail } from "@/lib/leads/emailTemplates";
import { DEFAULT_PROVIDER_CONFIGS, LEAD_INTELLIGENCE_CACHE_TTL_MS, leadIntelligenceUserAgent } from "./defaults";
import { NominatimGeocodingProvider, OpenStreetMapOverpassProvider } from "./providers";
import type {
  GeocodingResult,
  LeadIntelligenceProviderConfig,
  LeadIntelligenceSearch,
  LeadIntelligenceSearchCriteria,
  LeadIntelligenceSearchResult,
  LeadIntelligenceSearchRun,
  ProviderExecutionContext,
} from "./types";
import {
  businessKeyFor,
  leadIntelligenceId,
  normalizeDomain,
  normalizePhone,
  normalizeSearchCriteria,
  normalizeText,
  parseNaturalLeadSearch,
  searchFingerprint,
  buildInitialFindings,
  scoreBusiness,
  stableStringify,
} from "./utils";

const SEARCH_FIELDS = `{
  _id, _type, _createdAt, name, description, criteria, searchFingerprint, status,
  lastRunId, lastRunAt, lastRunMessage, costMode, estimatedCostUsd, actualCostUsd, createdBy
}`;

const RUN_FIELDS = `{
  _id, _type, _createdAt, searchId, searchFingerprint, status, startedAt, completedAt,
  providers, providerStats, resultCount, dedupedCount, estimatedCostUsd, actualCostUsd,
  cacheHit, message, error
}`;

const RESULT_FIELDS = `{
  _id, _type, _createdAt, searchId, runId, businessKey, business, status, sources,
  findings, score, dismissed, doNotContact, savedToListIds, convertedPipelineContactId,
  reviewedAt, reviewNotes, outreachSubject, outreachBodyHtml, outreachGeneratedAt, outreachSentAt, lastVerifiedAt
}`;

type CreateSearchInput = {
  name?: string;
  description?: string | null;
  naturalLanguageQuery?: string;
  criteria?: Partial<LeadIntelligenceSearchCriteria>;
};

type PipelineMatch = {
  _id: string;
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  siteUrl: string | null;
  stage: string;
};

type UpdateResultInput = {
  dismissed?: boolean;
  doNotContact?: boolean;
  savedToListIds?: string[];
  reviewed?: boolean;
  reviewNotes?: string | null;
  outreachSubject?: string | null;
  outreachBodyHtml?: string | null;
  business?: Partial<LeadIntelligenceSearchResult["business"]>;
};

function estimateSearchCost(criteria: LeadIntelligenceSearchCriteria, providers: LeadIntelligenceProviderConfig[]) {
  const selected = providers.filter((provider) => criteria.providers.includes(provider.providerKey));
  const locationCount = Math.max(criteria.locations.length, 1);
  return selected.reduce((sum, provider) => sum + provider.estimatedCostPerRequestUsd * locationCount, 0);
}

function buildSearchName(input: CreateSearchInput, criteria: LeadIntelligenceSearchCriteria) {
  if (input.name?.trim()) return input.name.trim();
  if (criteria.naturalLanguageQuery) return criteria.naturalLanguageQuery;
  return `${criteria.categories.join(", ")} in ${criteria.locations.map((location) => location.query).join(", ")}`;
}

function cacheKey(prefix: string, value: unknown) {
  return `${prefix}-${searchFingerprint(normalizeSearchCriteria({ ...normalizeSearchCriteria({}), naturalLanguageQuery: stableStringify(value) }))}`;
}

function publicProviderConfig(provider: LeadIntelligenceProviderConfig): LeadIntelligenceProviderConfig {
  return {
    ...provider,
    apiKeyConfigured: provider.apiKeyConfigured,
  };
}

export async function listLeadIntelligenceProviderConfigs() {
  const stored = await sanityServer.fetch<LeadIntelligenceProviderConfig[]>(
    `*[_type == "leadIntelligenceProviderConfig"]`
  ).catch(() => []);
  const storedByKey = new Map(stored.map((provider) => [provider.providerKey, provider]));
  return DEFAULT_PROVIDER_CONFIGS.map((defaults) => publicProviderConfig({
    ...defaults,
    ...(storedByKey.get(defaults.providerKey) ?? {}),
    endpoint: storedByKey.get(defaults.providerKey)?.endpoint || defaults.endpoint,
  })).sort((a, b) => a.priority - b.priority);
}

export async function listLeadIntelligenceSearches(limit = 20) {
  return sanityServer.fetch<LeadIntelligenceSearch[]>(
    `*[_type == "leadIntelligenceSearch"] | order(_createdAt desc)[0...$limit] ${SEARCH_FIELDS}`,
    { limit }
  );
}

export async function listLeadIntelligenceRuns(limit = 20) {
  return sanityServer.fetch<LeadIntelligenceSearchRun[]>(
    `*[_type == "leadIntelligenceSearchRun"] | order(_createdAt desc)[0...$limit] ${RUN_FIELDS}`,
    { limit }
  );
}

export async function listLeadIntelligenceResults(runId?: string, limit = 100) {
  const filter = runId ? `&& runId == $runId` : "";
  return sanityServer.fetch<LeadIntelligenceSearchResult[]>(
    `*[_type == "leadIntelligenceSearchResult" ${filter}] | order(score.leadScore desc)[0...$limit] ${RESULT_FIELDS}`,
    runId ? { runId, limit } : { limit }
  );
}

export async function getLeadIntelligenceResult(id: string) {
  return sanityServer.fetch<LeadIntelligenceSearchResult | null>(
    `*[_type == "leadIntelligenceSearchResult" && _id == $id][0] ${RESULT_FIELDS}`,
    { id }
  );
}

export async function updateLeadIntelligenceResult(id: string, input: UpdateResultInput) {
  const result = await getLeadIntelligenceResult(id);
  if (!result) throw new Error("Lead Intelligence result not found");

  const patch: Partial<LeadIntelligenceSearchResult> = {};
  if (typeof input.dismissed === "boolean") patch.dismissed = input.dismissed;
  if (typeof input.doNotContact === "boolean") patch.doNotContact = input.doNotContact;
  if (Array.isArray(input.savedToListIds)) {
    patch.savedToListIds = Array.from(new Set(input.savedToListIds.map((value) => value.trim()).filter(Boolean)));
  }
  if (typeof input.reviewed === "boolean") {
    patch.reviewedAt = input.reviewed ? new Date().toISOString() : null;
  }
  if ("reviewNotes" in input) {
    patch.reviewNotes = input.reviewNotes?.trim() || null;
  }
  if ("outreachSubject" in input) {
    patch.outreachSubject = input.outreachSubject?.trim() || null;
  }
  if ("outreachBodyHtml" in input) {
    patch.outreachBodyHtml = input.outreachBodyHtml?.trim() || null;
  }
  if (input.business && typeof input.business === "object") {
    const business = { ...result.business };
    const stringFields: Array<keyof typeof business> = [
      "address",
      "city",
      "state",
      "postalCode",
      "country",
      "phone",
      "email",
      "website",
    ];
    for (const field of stringFields) {
      if (field in input.business) {
        const value = input.business[field];
        (business as Record<string, unknown>)[field] = typeof value === "string" && value.trim() ? value.trim() : null;
      }
    }
    if (input.business.name && typeof input.business.name === "string") {
      business.name = input.business.name.trim();
      business.normalizedName = normalizeText(input.business.name);
    }
    const findings = buildInitialFindings(business);
    patch.business = business;
    patch.findings = findings;
    patch.score = scoreBusiness(business, findings);
    patch.businessKey = businessKeyFor(business);
    patch.lastVerifiedAt = new Date().toISOString();
  }

  if (!Object.keys(patch).length) return result;
  await sanityWriteClient.patch(id).set(patch).commit();
  return getLeadIntelligenceResult(id);
}

function outreachAngle(result: LeadIntelligenceSearchResult) {
  const reviewed = result.reviewNotes?.trim();
  if (reviewed) return reviewed;
  const highSignal = result.findings.find((finding) => finding.severity === "high" || finding.severity === "medium");
  if (!highSignal) return null;
  return `${highSignal.evidence} That usually points to a practical follow-up opportunity around ${highSignal.recommendedService.toLowerCase()}.`;
}

export async function generateLeadIntelligenceOutreachDraft(id: string) {
  const result = await getLeadIntelligenceResult(id);
  if (!result) throw new Error("Lead Intelligence result not found");
  if (result.doNotContact) throw new Error("This lead is marked do not contact.");
  if (result.dismissed) throw new Error("Restore this lead before generating outreach.");

  const draft = buildOutreachEmail({
    businessName: result.business.name,
    city: result.business.city,
    region: result.business.state,
    niche: result.business.categories.join(", "),
    angle: outreachAngle(result),
  });
  const now = new Date().toISOString();
  await sanityWriteClient.patch(result._id).set({
    outreachSubject: draft.subject,
    outreachBodyHtml: draft.bodyHtml,
    outreachGeneratedAt: now,
    reviewedAt: result.reviewedAt ?? now,
  }).commit();
  return getLeadIntelligenceResult(id);
}

export async function sendLeadIntelligenceOutreach(id: string, input: { subject?: string; htmlBody?: string } = {}) {
  const result = await getLeadIntelligenceResult(id);
  if (!result) throw new Error("Lead Intelligence result not found");
  if (result.doNotContact) throw new Error("This lead is marked do not contact.");
  if (result.dismissed) throw new Error("Restore this lead before sending outreach.");
  if (!result.business.email) throw new Error("This lead does not have a public email address saved.");

  const subject = input.subject?.trim() || result.outreachSubject?.trim();
  const htmlBody = input.htmlBody?.trim() || result.outreachBodyHtml?.trim();
  if (!subject || !htmlBody) throw new Error("Generate or enter an outreach draft before sending.");

  const sendResult = await sendEmail({
    to: result.business.email,
    subject,
    htmlBody,
  });

  const now = new Date().toISOString();
  await sanityWriteClient.patch(result._id).set({
    outreachSubject: subject,
    outreachBodyHtml: htmlBody,
    outreachSentAt: now,
    reviewedAt: result.reviewedAt ?? now,
  }).commit();

  return { sendResult, result: await getLeadIntelligenceResult(id) };
}

export async function getLeadIntelligenceSearch(id: string) {
  return sanityServer.fetch<LeadIntelligenceSearch | null>(
    `*[_type == "leadIntelligenceSearch" && _id == $id][0] ${SEARCH_FIELDS}`,
    { id }
  );
}

export async function createLeadIntelligenceSearch(input: CreateSearchInput) {
  const parsed = input.naturalLanguageQuery?.trim()
    ? parseNaturalLeadSearch(input.naturalLanguageQuery)
    : normalizeSearchCriteria(input.criteria ?? {});
  const criteria = normalizeSearchCriteria({
    ...parsed,
    ...(input.criteria ?? {}),
    naturalLanguageQuery: input.naturalLanguageQuery?.trim() || parsed.naturalLanguageQuery,
  });
  const providers = await listLeadIntelligenceProviderConfigs();
  const fingerprint = searchFingerprint(criteria);
  const now = new Date().toISOString();
  const doc: LeadIntelligenceSearch = {
    _id: leadIntelligenceId("search"),
    _type: "leadIntelligenceSearch",
    name: buildSearchName(input, criteria),
    description: input.description?.trim() || null,
    criteria,
    searchFingerprint: fingerprint,
    status: "draft",
    lastRunId: null,
    lastRunAt: null,
    lastRunMessage: null,
    costMode: criteria.costMode,
    estimatedCostUsd: estimateSearchCost(criteria, providers),
    actualCostUsd: 0,
    createdBy: null,
  };
  await sanityWriteClient.create({ ...doc, createdAt: now });
  return doc;
}

async function findCachedRun(fingerprint: string) {
  const since = new Date(Date.now() - LEAD_INTELLIGENCE_CACHE_TTL_MS).toISOString();
  return sanityServer.fetch<LeadIntelligenceSearchRun | null>(
    `*[_type == "leadIntelligenceSearchRun" && searchFingerprint == $fingerprint && status == "completed" && completedAt > $since] | order(completedAt desc)[0] ${RUN_FIELDS}`,
    { fingerprint, since }
  );
}

async function getCachedGeocoding(query: string) {
  const key = cacheKey("geocode", query);
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const cached = await sanityServer.fetch<{ result: GeocodingResult; retrievedAt: string } | null>(
    `*[_type == "leadIntelligenceGeocodingCache" && cacheKey == $key && retrievedAt > $since][0]{ result, retrievedAt }`,
    { key, since }
  ).catch(() => null);
  return cached?.result ?? null;
}

async function cacheGeocoding(query: string, result: GeocodingResult) {
  const key = cacheKey("geocode", query);
  await sanityWriteClient.createOrReplace({
    _id: key,
    _type: "leadIntelligenceGeocodingCache",
    cacheKey: key,
    query,
    result,
    retrievedAt: new Date().toISOString(),
  }).catch(() => null);
}

async function geocodeCriteria(criteria: LeadIntelligenceSearchCriteria, providers: LeadIntelligenceProviderConfig[], context: ProviderExecutionContext) {
  const nominatimConfig = providers.find((provider) => provider.providerKey === "nominatim" && provider.enabled && !provider.circuitOpen);
  if (!nominatimConfig) return criteria;
  const geocoder = new NominatimGeocodingProvider(nominatimConfig);
  const locations = [];
  for (const location of criteria.locations) {
    if ((location.latitude != null && location.longitude != null) || location.boundingBox) {
      locations.push(location);
      continue;
    }
    const cached = await getCachedGeocoding(location.query);
    const result = cached ?? await geocoder.geocode(location.query, context);
    if (result && !cached) await cacheGeocoding(location.query, result);
    locations.push(result ? {
      ...location,
      query: result.displayName || location.query,
      latitude: result.latitude,
      longitude: result.longitude,
      boundingBox: result.boundingBox,
    } : location);
  }
  return normalizeSearchCriteria({ ...criteria, locations });
}

async function createRun(search: LeadIntelligenceSearch, cacheHit = false) {
  const now = new Date().toISOString();
  const run: LeadIntelligenceSearchRun = {
    _id: leadIntelligenceId("run"),
    _type: "leadIntelligenceSearchRun",
    searchId: search._id,
    searchFingerprint: search.searchFingerprint,
    status: "running",
    startedAt: now,
    completedAt: null,
    providers: search.criteria.providers,
    providerStats: [],
    resultCount: 0,
    dedupedCount: 0,
    estimatedCostUsd: search.estimatedCostUsd,
    actualCostUsd: 0,
    cacheHit,
    message: null,
    error: null,
  };
  await sanityWriteClient.create(run);
  return run;
}

async function writeProviderUsage(runId: string, searchId: string, stats: LeadIntelligenceSearchRun["providerStats"][number]) {
  await sanityWriteClient.create({
    _type: "leadIntelligenceProviderUsageRecord",
    providerKey: stats.providerKey,
    runId,
    searchId,
    requestedAt: stats.requestedAt,
    completedAt: stats.completedAt,
    requestCount: stats.requestCount,
    resultCount: stats.resultCount,
    costUsd: stats.costUsd,
    status: stats.status,
    cacheHit: stats.cacheHit,
    message: stats.message,
  }).catch(() => null);
}

async function updateProviderHealth(config: LeadIntelligenceProviderConfig, ok: boolean) {
  await sanityWriteClient.createIfNotExists(config).catch(() => null);
  await sanityWriteClient.patch(config._id).set({
    healthStatus: ok ? "healthy" : "failed",
    circuitOpen: false,
    [ok ? "lastSuccessfulRequestAt" : "lastFailedRequestAt"]: new Date().toISOString(),
  }).commit().catch(() => null);
}

function mergeResults(results: LeadIntelligenceSearchResult[]) {
  const merged = new Map<string, LeadIntelligenceSearchResult>();
  let duplicates = 0;
  for (const result of results) {
    const key = result.businessKey || businessKeyFor(result.business);
    const existing = merged.get(key);
    if (!existing) {
      merged.set(key, result);
      continue;
    }
    duplicates++;
    existing.business.categories = Array.from(new Set([...existing.business.categories, ...result.business.categories]));
    existing.business.providerIds = Array.from(new Set([...existing.business.providerIds, ...result.business.providerIds]));
    existing.sources = [...existing.sources, ...result.sources];
    existing.findings = [...existing.findings, ...result.findings].filter((finding, index, all) =>
      all.findIndex((candidate) => candidate.key === finding.key) === index
    );
    existing.score = existing.score.leadScore >= result.score.leadScore ? existing.score : result.score;
  }
  return { results: Array.from(merged.values()), duplicates };
}

export async function runLeadIntelligenceSearch(searchId: string, opts: { force?: boolean } = {}) {
  const search = await getLeadIntelligenceSearch(searchId);
  if (!search) throw new Error("Lead Intelligence search not found");

  if (!opts.force) {
    const cachedRun = await findCachedRun(search.searchFingerprint);
    if (cachedRun) {
      await sanityWriteClient.patch(search._id).set({
        status: "cached",
        lastRunId: cachedRun._id,
        lastRunAt: cachedRun.completedAt,
        lastRunMessage: "Reused a recent equivalent search from cache.",
      }).commit();
      return {
        search: { ...search, status: "cached" as const, lastRunId: cachedRun._id, lastRunAt: cachedRun.completedAt, lastRunMessage: "Reused a recent equivalent search from cache." },
        run: cachedRun,
        results: await listLeadIntelligenceResults(cachedRun._id, search.criteria.limit),
        cacheHit: true,
      };
    }
  }

  const run = await createRun(search);
  await sanityWriteClient.patch(search._id).set({ status: "running", lastRunId: run._id, lastRunAt: run.startedAt }).commit();

  const providers = await listLeadIntelligenceProviderConfigs();
  const context: ProviderExecutionContext = {
    now: new Date().toISOString(),
    correlationId: randomUUID(),
    timeoutMs: 30000,
    userAgent: leadIntelligenceUserAgent(),
  };

  try {
    const criteria = await geocodeCriteria(search.criteria, providers, context);
    const overpassConfig = providers.find((provider) => provider.providerKey === "openstreetmap-overpass" && provider.enabled && !provider.circuitOpen);
    const providerStats: LeadIntelligenceSearchRun["providerStats"] = [];
    let providerResults: LeadIntelligenceSearchResult[] = [];

    if (overpassConfig && criteria.providers.includes("openstreetmap-overpass")) {
      const provider = new OpenStreetMapOverpassProvider(overpassConfig);
      const providerResult = await provider.search(criteria, context);
      providerStats.push(providerResult.providerStats);
      providerResults = providerResults.concat(providerResult.results);
      await writeProviderUsage(run._id, search._id, providerResult.providerStats);
      await updateProviderHealth(overpassConfig, providerResult.providerStats.status === "success");
    }

    const merged = mergeResults(providerResults);
    const limited = merged.results.slice(0, criteria.limit).map((result) => ({
      ...result,
      searchId: search._id,
      runId: run._id,
    }));

    for (const result of limited) {
      await sanityWriteClient.createOrReplace(result);
    }

    const completedAt = new Date().toISOString();
    const message = limited.length
      ? `Found ${limited.length} normalized lead result${limited.length === 1 ? "" : "s"} from ${providerStats.length} provider${providerStats.length === 1 ? "" : "s"}.`
      : providerStats.some((stats) => stats.status === "failed")
        ? providerStats.map((stats) => stats.message).filter(Boolean).join(" ")
        : "No matching businesses were found.";
    const finalRun: LeadIntelligenceSearchRun = {
      ...run,
      status: providerStats.some((stats) => stats.status === "success") || limited.length ? "completed" : "failed",
      completedAt,
      providerStats,
      resultCount: limited.length,
      dedupedCount: merged.duplicates,
      actualCostUsd: providerStats.reduce((sum, stats) => sum + stats.costUsd, 0),
      message,
      error: limited.length || providerStats.some((stats) => stats.status === "success") ? null : message,
    };
    await sanityWriteClient.patch(run._id).set({
      status: finalRun.status,
      completedAt: finalRun.completedAt,
      providerStats: finalRun.providerStats,
      resultCount: finalRun.resultCount,
      dedupedCount: finalRun.dedupedCount,
      actualCostUsd: finalRun.actualCostUsd,
      message: finalRun.message,
      error: finalRun.error,
    }).commit();
    await sanityWriteClient.patch(search._id).set({
      status: finalRun.status === "completed" ? "completed" : "failed",
      criteria,
      lastRunId: run._id,
      lastRunAt: completedAt,
      lastRunMessage: message,
      actualCostUsd: finalRun.actualCostUsd,
    }).commit();

    return {
      search: { ...search, criteria, status: finalRun.status === "completed" ? "completed" as const : "failed" as const, lastRunId: run._id, lastRunAt: completedAt, lastRunMessage: message },
      run: finalRun,
      results: limited,
      cacheHit: false,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Lead Intelligence search failed";
    const completedAt = new Date().toISOString();
    await sanityWriteClient.patch(run._id).set({
      status: "failed",
      completedAt,
      message,
      error: message,
    }).commit();
    await sanityWriteClient.patch(search._id).set({
      status: "failed",
      lastRunId: run._id,
      lastRunAt: completedAt,
      lastRunMessage: message,
    }).commit();
    throw err;
  }
}

export async function getLeadIntelligenceUsageSummary() {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const records = await sanityServer.fetch<Array<{ providerKey: string; requestCount?: number; resultCount?: number; costUsd?: number; status?: string }>>(
    `*[_type == "leadIntelligenceProviderUsageRecord" && requestedAt > $since]{
      providerKey, requestCount, resultCount, costUsd, status
    }`,
    { since }
  ).catch(() => []);

  const byProvider = new Map<string, { providerKey: string; requests: number; results: number; costUsd: number; failures: number }>();
  for (const record of records) {
    const current = byProvider.get(record.providerKey) ?? { providerKey: record.providerKey, requests: 0, results: 0, costUsd: 0, failures: 0 };
    current.requests += Number(record.requestCount ?? 0);
    current.results += Number(record.resultCount ?? 0);
    current.costUsd += Number(record.costUsd ?? 0);
    current.failures += record.status === "failed" ? 1 : 0;
    byProvider.set(record.providerKey, current);
  }

  return {
    windowDays: 30,
    requests: records.reduce((sum, record) => sum + Number(record.requestCount ?? 0), 0),
    results: records.reduce((sum, record) => sum + Number(record.resultCount ?? 0), 0),
    costUsd: records.reduce((sum, record) => sum + Number(record.costUsd ?? 0), 0),
    avoidedGoogleCostUsd: records.reduce((sum, record) => sum + Number(record.requestCount ?? 0), 0) * 0.032,
    byProvider: Array.from(byProvider.values()),
  };
}

async function findPipelineMatches(result: LeadIntelligenceSearchResult) {
  const business = result.business;
  const name = normalizeText(business.name);
  const phone = normalizePhone(business.phone);
  const domain = normalizeDomain(business.website);
  const contacts = await sanityServer.fetch<PipelineMatch[]>(
    `*[_type == "pipelineContact"]{
      _id, name, company, email, phone, siteUrl, stage
    }`
  );
  return contacts.filter((contact) => {
    const contactName = normalizeText(contact.name);
    const company = normalizeText(contact.company);
    const contactPhone = normalizePhone(contact.phone);
    const contactDomain = normalizeDomain(contact.siteUrl);
    return (name && (contactName === name || company === name))
      || (phone && contactPhone === phone)
      || (domain && contactDomain === domain);
  }).slice(0, 5);
}

function leadIntelligenceNotes(result: LeadIntelligenceSearchResult) {
  return [
    "Source: CEL3 Lead Intelligence",
    `Lead score: ${result.score.leadScore}`,
    `Opportunity score: ${result.score.opportunityScore}`,
    `Confidence: ${result.score.confidence}`,
    result.business.website ? `Website: ${result.business.website}` : null,
    result.sources[0]?.sourceUrl ? `Primary source: ${result.sources[0].sourceUrl}` : null,
    "",
    "Opportunity signals:",
    ...result.findings.map((finding) => `- ${finding.label}: ${finding.evidence}`),
  ].filter(Boolean).join("\n");
}

export async function convertLeadIntelligenceResultToPipeline(id: string, opts: { force?: boolean } = {}) {
  const result = await getLeadIntelligenceResult(id);
  if (!result) throw new Error("Lead Intelligence result not found");
  if (result.convertedPipelineContactId && !opts.force) {
    return { created: false, contactId: result.convertedPipelineContactId, possibleMatches: [] as PipelineMatch[] };
  }

  const possibleMatches = await findPipelineMatches(result);
  if (possibleMatches.length && !opts.force) {
    return { created: false, contactId: null, possibleMatches };
  }

  const now = new Date().toISOString();
  const contact = await sanityWriteClient.create({
    _type: "pipelineContact",
    name: result.business.name,
    email: result.business.email,
    phone: result.business.phone,
    company: result.business.name,
    source: "CEL3 Lead Intelligence",
    notes: leadIntelligenceNotes(result),
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
    siteUrl: result.business.website,
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
    text: "Converted from CEL3 Lead Intelligence",
    fromStage: null,
    toStage: "new-lead",
    author: "Admin",
  });
  await syncContactProfileFromPipeline(contact._id).catch((err) => {
    console.error("LEAD_INTELLIGENCE_CONVERT_SYNC_ERR:", err);
  });
  await sanityWriteClient.patch(result._id).set({ convertedPipelineContactId: contact._id }).commit();

  return { created: true, contactId: contact._id, possibleMatches: [] as PipelineMatch[] };
}

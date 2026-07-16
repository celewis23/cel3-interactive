export type LeadIntelligenceCostMode = "free-only" | "low-cost" | "best-available" | "manual-approval";

export type LeadIntelligenceSearchStatus = "draft" | "running" | "completed" | "cached" | "failed";

export type LeadIntelligenceRunStatus = "running" | "completed" | "failed" | "cancelled";

export type LeadIntelligenceProviderHealth = "healthy" | "degraded" | "disabled" | "failed" | "unreviewed";

export type LeadIntelligenceEnrichmentStatus =
  | "discovered"
  | "normalizing"
  | "deduplicated"
  | "website-found"
  | "contact-data-found"
  | "opportunity-scored"
  | "fully-enriched"
  | "enrichment-incomplete"
  | "enrichment-failed";

export type LeadIntelligenceBoundingBox = {
  north: number;
  south: number;
  east: number;
  west: number;
};

export type LeadIntelligenceLocationCriteria = {
  query: string;
  country?: string | null;
  state?: string | null;
  county?: string | null;
  city?: string | null;
  postalCode?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  radiusMiles?: number | null;
  boundingBox?: LeadIntelligenceBoundingBox | null;
};

export type LeadIntelligenceSearchCriteria = {
  naturalLanguageQuery?: string | null;
  locations: LeadIntelligenceLocationCriteria[];
  categories: string[];
  keywords: string[];
  includedCategories: string[];
  excludedCategories: string[];
  websiteFilters: string[];
  opportunityFilters: string[];
  contactFilters: string[];
  leadQualityFilters: string[];
  costMode: LeadIntelligenceCostMode;
  providers: string[];
  limit: number;
  sort: string;
};

export type LeadIntelligenceProviderConfig = {
  _id: string;
  _type: "leadIntelligenceProviderConfig";
  providerKey: string;
  label: string;
  enabled: boolean;
  endpoint: string;
  apiKeyConfigured: boolean;
  perMinuteLimit: number;
  perDayLimit: number;
  monthlyBudgetUsd: number;
  timeoutMs: number;
  retryCount: number;
  priority: number;
  estimatedCostPerRequestUsd: number;
  attribution: string;
  termsUrl: string;
  policyReviewed: boolean;
  healthStatus: LeadIntelligenceProviderHealth;
  circuitOpen: boolean;
  lastSuccessfulRequestAt: string | null;
  lastFailedRequestAt: string | null;
};

export type LeadIntelligenceSourceEvidence = {
  providerKey: string;
  providerRecordId: string;
  sourceUrl: string | null;
  dataType: string;
  retrievedAt: string;
  confidence: number;
  attribution: string | null;
  licenseNote: string | null;
  freshness: "current" | "historical" | "inferred" | "user-entered";
};

export type LeadIntelligenceBusiness = {
  name: string;
  normalizedName: string;
  categories: string[];
  address: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  socialProfiles: string[];
  providerIds: string[];
};

export type LeadIntelligenceFinding = {
  key: string;
  label: string;
  severity: "info" | "low" | "medium" | "high";
  evidence: string;
  recommendedService: string;
};

export type LeadIntelligenceScore = {
  leadScore: number;
  opportunityScore: number;
  riskScore: number;
  confidence: number;
  reasons: string[];
};

export type LeadIntelligenceSearch = {
  _id: string;
  _type: "leadIntelligenceSearch";
  _createdAt?: string;
  name: string;
  description: string | null;
  criteria: LeadIntelligenceSearchCriteria;
  searchFingerprint: string;
  status: LeadIntelligenceSearchStatus;
  lastRunId: string | null;
  lastRunAt: string | null;
  lastRunMessage: string | null;
  costMode: LeadIntelligenceCostMode;
  estimatedCostUsd: number;
  actualCostUsd: number;
  createdBy: string | null;
};

export type LeadIntelligenceSearchRun = {
  _id: string;
  _type: "leadIntelligenceSearchRun";
  _createdAt?: string;
  searchId: string;
  searchFingerprint: string;
  status: LeadIntelligenceRunStatus;
  startedAt: string;
  completedAt: string | null;
  providers: string[];
  providerStats: LeadIntelligenceProviderRunStats[];
  resultCount: number;
  dedupedCount: number;
  estimatedCostUsd: number;
  actualCostUsd: number;
  cacheHit: boolean;
  message: string | null;
  error: string | null;
};

export type LeadIntelligenceProviderRunStats = {
  providerKey: string;
  status: "skipped" | "success" | "failed";
  requestedAt: string;
  completedAt: string | null;
  requestCount: number;
  resultCount: number;
  costUsd: number;
  cacheHit: boolean;
  message: string | null;
};

export type LeadIntelligenceSearchResult = {
  _id: string;
  _type: "leadIntelligenceSearchResult";
  _createdAt?: string;
  searchId: string;
  runId: string;
  businessKey: string;
  business: LeadIntelligenceBusiness;
  status: LeadIntelligenceEnrichmentStatus;
  sources: LeadIntelligenceSourceEvidence[];
  findings: LeadIntelligenceFinding[];
  score: LeadIntelligenceScore;
  dismissed: boolean;
  doNotContact: boolean;
  savedToListIds: string[];
  convertedPipelineContactId: string | null;
  reviewedAt?: string | null;
  reviewNotes?: string | null;
  outreachSubject?: string | null;
  outreachBodyHtml?: string | null;
  outreachGeneratedAt?: string | null;
  outreachSentAt?: string | null;
  lastVerifiedAt: string | null;
};

export type ProviderSearchResult = {
  providerKey: string;
  providerStats: LeadIntelligenceProviderRunStats;
  results: LeadIntelligenceSearchResult[];
  rawResponseId: string | null;
};

export type GeocodingResult = {
  query: string;
  displayName: string;
  latitude: number;
  longitude: number;
  boundingBox: LeadIntelligenceBoundingBox | null;
  sourceUrl: string | null;
};

export interface ILeadDiscoveryProvider {
  providerKey: string;
  search(criteria: LeadIntelligenceSearchCriteria, context: ProviderExecutionContext): Promise<ProviderSearchResult>;
}

export interface IGeocodingProvider {
  providerKey: string;
  geocode(query: string, context: ProviderExecutionContext): Promise<GeocodingResult | null>;
}

export type ProviderExecutionContext = {
  now: string;
  correlationId: string;
  timeoutMs: number;
  userAgent: string;
};

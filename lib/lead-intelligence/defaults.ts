import type { LeadIntelligenceProviderConfig, LeadIntelligenceSearchCriteria } from "./types";

export const LEAD_INTELLIGENCE_DEFAULT_LIMIT = 50;
export const LEAD_INTELLIGENCE_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export const DEFAULT_LEAD_INTELLIGENCE_CRITERIA: LeadIntelligenceSearchCriteria = {
  naturalLanguageQuery: null,
  locations: [{ query: "Richmond, Virginia", radiusMiles: 15 }],
  categories: ["Restaurant"],
  keywords: [],
  includedCategories: [],
  excludedCategories: [],
  websiteFilters: [],
  opportunityFilters: [],
  contactFilters: [],
  leadQualityFilters: [],
  costMode: "free-only",
  providers: ["openstreetmap-overpass"],
  limit: LEAD_INTELLIGENCE_DEFAULT_LIMIT,
  sort: "best-opportunity",
};

export const DEFAULT_PROVIDER_CONFIGS: LeadIntelligenceProviderConfig[] = [
  {
    _id: "lead-intelligence-provider-openstreetmap-overpass",
    _type: "leadIntelligenceProviderConfig",
    providerKey: "openstreetmap-overpass",
    label: "OpenStreetMap / Overpass",
    enabled: true,
    endpoint: process.env.LEAD_INTELLIGENCE_OVERPASS_ENDPOINT || "https://overpass-api.de/api/interpreter",
    apiKeyConfigured: false,
    perMinuteLimit: 12,
    perDayLimit: 1000,
    monthlyBudgetUsd: 0,
    timeoutMs: 25000,
    retryCount: 1,
    priority: 10,
    estimatedCostPerRequestUsd: 0,
    attribution: "OpenStreetMap contributors",
    termsUrl: "https://wiki.openstreetmap.org/wiki/Overpass_API",
    policyReviewed: false,
    healthStatus: "unreviewed",
    circuitOpen: false,
    lastSuccessfulRequestAt: null,
    lastFailedRequestAt: null,
  },
  {
    _id: "lead-intelligence-provider-nominatim",
    _type: "leadIntelligenceProviderConfig",
    providerKey: "nominatim",
    label: "Nominatim-compatible Geocoding",
    enabled: true,
    endpoint: process.env.LEAD_INTELLIGENCE_NOMINATIM_ENDPOINT || "https://nominatim.openstreetmap.org/search",
    apiKeyConfigured: false,
    perMinuteLimit: 1,
    perDayLimit: 1000,
    monthlyBudgetUsd: 0,
    timeoutMs: 15000,
    retryCount: 0,
    priority: 5,
    estimatedCostPerRequestUsd: 0,
    attribution: "OpenStreetMap contributors",
    termsUrl: "https://operations.osmfoundation.org/policies/nominatim/",
    policyReviewed: false,
    healthStatus: "unreviewed",
    circuitOpen: false,
    lastSuccessfulRequestAt: null,
    lastFailedRequestAt: null,
  },
];

export function leadIntelligenceUserAgent() {
  return process.env.LEAD_INTELLIGENCE_USER_AGENT?.trim()
    || "CEL3 Lead Intelligence/1.0 (configure LEAD_INTELLIGENCE_USER_AGENT for production contact info)";
}

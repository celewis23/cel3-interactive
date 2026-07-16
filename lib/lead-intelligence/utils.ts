import { createHash, randomUUID } from "crypto";
import type {
  LeadIntelligenceBusiness,
  LeadIntelligenceFinding,
  LeadIntelligenceScore,
  LeadIntelligenceSearchCriteria,
} from "./types";
import { DEFAULT_LEAD_INTELLIGENCE_CRITERIA, LEAD_INTELLIGENCE_DEFAULT_LIMIT } from "./defaults";

export function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

export function searchFingerprint(criteria: LeadIntelligenceSearchCriteria) {
  return createHash("sha1").update(stableStringify(normalizeSearchCriteria(criteria))).digest("hex");
}

export function leadIntelligenceId(prefix: string) {
  return `lead-intelligence-${prefix}-${randomUUID()}`;
}

export function normalizeText(value: string | null | undefined) {
  return value?.trim().toLowerCase().replace(/\s+/g, " ") || "";
}

export function normalizeDomain(value: string | null | undefined) {
  if (!value) return "";
  try {
    return new URL(value).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return value.toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0] ?? "";
  }
}

export function normalizePhone(value: string | null | undefined) {
  return value?.replace(/\D/g, "") || "";
}

export function businessKeyFor(business: LeadIntelligenceBusiness) {
  const domain = normalizeDomain(business.website);
  if (domain) return `domain:${domain}`;
  const phone = normalizePhone(business.phone);
  if (phone) return `phone:${phone}`;
  const geo = business.latitude && business.longitude
    ? `${business.latitude.toFixed(3)},${business.longitude.toFixed(3)}`
    : normalizeText([business.city, business.state, business.address].filter(Boolean).join(" "));
  return `name-location:${normalizeText(business.name)}|${geo}`;
}

export function uniqueStrings(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.map((value) => value?.trim() || "").filter(Boolean)));
}

export function normalizeSearchCriteria(input: Partial<LeadIntelligenceSearchCriteria>): LeadIntelligenceSearchCriteria {
  const merged = {
    ...DEFAULT_LEAD_INTELLIGENCE_CRITERIA,
    ...input,
  };
  const locations = Array.isArray(input.locations) && input.locations.length
    ? input.locations
    : DEFAULT_LEAD_INTELLIGENCE_CRITERIA.locations;

  return {
    naturalLanguageQuery: input.naturalLanguageQuery?.trim() || null,
    locations: locations.map((location) => ({
      query: location.query?.trim() || DEFAULT_LEAD_INTELLIGENCE_CRITERIA.locations[0].query,
      country: location.country?.trim() || null,
      state: location.state?.trim() || null,
      county: location.county?.trim() || null,
      city: location.city?.trim() || null,
      postalCode: location.postalCode?.trim() || null,
      latitude: Number.isFinite(Number(location.latitude)) ? Number(location.latitude) : null,
      longitude: Number.isFinite(Number(location.longitude)) ? Number(location.longitude) : null,
      radiusMiles: Number.isFinite(Number(location.radiusMiles)) ? Math.min(Math.max(Number(location.radiusMiles), 1), 100) : 15,
      boundingBox: location.boundingBox ?? null,
    })),
    categories: uniqueStrings(merged.categories).length ? uniqueStrings(merged.categories) : DEFAULT_LEAD_INTELLIGENCE_CRITERIA.categories,
    keywords: uniqueStrings(merged.keywords),
    includedCategories: uniqueStrings(merged.includedCategories),
    excludedCategories: uniqueStrings(merged.excludedCategories),
    websiteFilters: uniqueStrings(merged.websiteFilters),
    opportunityFilters: uniqueStrings(merged.opportunityFilters),
    contactFilters: uniqueStrings(merged.contactFilters),
    leadQualityFilters: uniqueStrings(merged.leadQualityFilters),
    costMode: merged.costMode ?? "free-only",
    providers: uniqueStrings(merged.providers).length ? uniqueStrings(merged.providers) : ["openstreetmap-overpass"],
    limit: Number.isFinite(Number(merged.limit)) ? Math.min(Math.max(Number(merged.limit), 1), 200) : LEAD_INTELLIGENCE_DEFAULT_LIMIT,
    sort: merged.sort || "best-opportunity",
  };
}

export function parseNaturalLeadSearch(query: string): LeadIntelligenceSearchCriteria {
  const cleaned = query.trim();
  const lower = cleaned.toLowerCase();
  const inMatch = cleaned.match(/^(.+?)\s+(?:in|near|around|within)\s+(.+)$/i);
  let categoryPart = inMatch?.[1]?.trim() || cleaned;
  let locationPart = inMatch?.[2]?.trim() || DEFAULT_LEAD_INTELLIGENCE_CRITERIA.locations[0].query;
  const radiusMatch = cleaned.match(/within\s+(\d+)\s*(?:miles?|mi)\b/i);
  const radiusMiles = radiusMatch ? Number(radiusMatch[1]) : 15;

  if (radiusMatch && inMatch) {
    locationPart = locationPart.replace(radiusMatch[0], "").replace(/^\s+of\s+/i, "").trim() || locationPart;
  }

  const websiteFilters: string[] = [];
  const contactFilters: string[] = [];
  const opportunityFilters: string[] = [];
  const keywords: string[] = [];

  if (lower.includes("without online booking") || lower.includes("without booking")) opportunityFilters.push("missing-online-booking");
  if (lower.includes("without online ordering") || lower.includes("missing online ordering")) opportunityFilters.push("missing-online-ordering");
  if (lower.includes("without online giving") || lower.includes("missing online giving")) opportunityFilters.push("missing-online-giving");
  if (lower.includes("no website") || lower.includes("without a website") || lower.includes("missing website")) websiteFilters.push("missing-website");
  if (lower.includes("outdated website") || lower.includes("poor mobile") || lower.includes("outdated design")) websiteFilters.push("weak-website");
  if (lower.includes("no email") || lower.includes("without visible email") || lower.includes("missing email")) contactFilters.push("missing-email");
  if (lower.includes("low review")) keywords.push("low review count");
  if (lower.includes("wix")) keywords.push("wix");
  if (lower.includes("black-owned") || lower.includes("black owned")) keywords.push("black-owned");

  categoryPart = categoryPart
    .replace(/with(?:out)? .+$/i, "")
    .replace(/using wix/i, "")
    .replace(/local businesses?/i, "business")
    .trim();

  return normalizeSearchCriteria({
    naturalLanguageQuery: cleaned,
    locations: [{ query: locationPart, radiusMiles }],
    categories: categoryPart ? [categoryPart] : DEFAULT_LEAD_INTELLIGENCE_CRITERIA.categories,
    keywords,
    websiteFilters,
    opportunityFilters,
    contactFilters,
    costMode: "free-only",
    providers: ["openstreetmap-overpass"],
    limit: LEAD_INTELLIGENCE_DEFAULT_LIMIT,
    sort: "best-opportunity",
  });
}

export function scoreBusiness(business: LeadIntelligenceBusiness, findings: LeadIntelligenceFinding[]): LeadIntelligenceScore {
  const dataPoints = [
    business.name,
    business.address,
    business.phone,
    business.email,
    business.website,
    business.latitude != null && business.longitude != null ? "geo" : null,
  ].filter(Boolean).length;
  const highFindings = findings.filter((finding) => finding.severity === "high").length;
  const mediumFindings = findings.filter((finding) => finding.severity === "medium").length;
  const opportunityScore = Math.min(100, 35 + highFindings * 25 + mediumFindings * 12 + (business.website ? 5 : 20));
  const confidence = Math.min(95, 25 + dataPoints * 10 + business.providerIds.length * 5);
  const riskScore = Math.max(5, 35 - dataPoints * 4 + (business.email ? 0 : 8));
  const leadScore = Math.round((opportunityScore * 0.55) + (confidence * 0.35) - (riskScore * 0.1));

  return {
    leadScore: Math.max(0, Math.min(100, leadScore)),
    opportunityScore,
    riskScore,
    confidence,
    reasons: [
      business.website ? "Website is available for audit and technology enrichment." : "No website was found in the source data.",
      business.phone || business.email ? "Public contact data is present." : "Public contact data is limited.",
      findings.length ? `${findings.length} opportunity signal${findings.length === 1 ? "" : "s"} detected.` : "No major opportunity signal detected yet.",
    ],
  };
}

export function buildInitialFindings(business: LeadIntelligenceBusiness): LeadIntelligenceFinding[] {
  const findings: LeadIntelligenceFinding[] = [];
  if (!business.website) {
    findings.push({
      key: "missing-website",
      label: "No website found",
      severity: "high",
      evidence: "The discovery source did not provide a website URL.",
      recommendedService: "New website or landing page",
    });
  }
  if (!business.email) {
    findings.push({
      key: "missing-email",
      label: "No public email found",
      severity: "medium",
      evidence: "The discovery source did not include a public email address.",
      recommendedService: "Lead capture and contact workflow",
    });
  }
  if (!business.phone) {
    findings.push({
      key: "missing-phone",
      label: "No phone found",
      severity: "low",
      evidence: "The discovery source did not include a phone number.",
      recommendedService: "Contact and inquiry flow cleanup",
    });
  }
  return findings;
}

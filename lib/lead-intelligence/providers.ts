import type {
  GeocodingResult,
  IGeocodingProvider,
  ILeadDiscoveryProvider,
  LeadIntelligenceBusiness,
  LeadIntelligenceBoundingBox,
  LeadIntelligenceLocationCriteria,
  LeadIntelligenceProviderConfig,
  LeadIntelligenceSearchCriteria,
  LeadIntelligenceSearchResult,
  ProviderExecutionContext,
  ProviderSearchResult,
} from "./types";
import { resolveOsmCategoryMappings } from "./categoryMapping";
import { buildInitialFindings, businessKeyFor, leadIntelligenceId, normalizeSearchCriteria, normalizeText, scoreBusiness, uniqueStrings } from "./utils";

type NominatimResponse = Array<{
  display_name?: string;
  lat?: string;
  lon?: string;
  boundingbox?: [string, string, string, string];
}>;

type OverpassElement = {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat?: number; lon?: number };
  tags?: Record<string, string>;
};

type OverpassResponse = {
  elements?: OverpassElement[];
  remark?: string;
};

function timeoutSignal(timeoutMs: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return { controller, done: () => clearTimeout(timer) };
}

function parseBoundingBox(value: [string, string, string, string] | undefined): LeadIntelligenceBoundingBox | null {
  if (!value) return null;
  const [south, north, west, east] = value.map(Number);
  if ([north, south, east, west].every(Number.isFinite)) return { north, south, east, west };
  return null;
}

export class NominatimGeocodingProvider implements IGeocodingProvider {
  providerKey = "nominatim";

  constructor(private config: LeadIntelligenceProviderConfig) {}

  async geocode(query: string, context: ProviderExecutionContext): Promise<GeocodingResult | null> {
    const url = new URL(this.config.endpoint);
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("limit", "1");
    url.searchParams.set("q", query);

    const signal = timeoutSignal(Math.min(this.config.timeoutMs, context.timeoutMs));
    try {
      const res = await fetch(url, {
        cache: "no-store",
        signal: signal.controller.signal,
        headers: {
          "User-Agent": context.userAgent,
          "Accept": "application/json",
        },
      });
      if (!res.ok) throw new Error(`Nominatim request failed with HTTP ${res.status}`);
      const body = await res.json() as NominatimResponse;
      const first = body[0];
      if (!first?.lat || !first.lon) return null;
      return {
        query,
        displayName: first.display_name || query,
        latitude: Number(first.lat),
        longitude: Number(first.lon),
        boundingBox: parseBoundingBox(first.boundingbox),
        sourceUrl: url.toString(),
      };
    } finally {
      signal.done();
    }
  }
}

function osmValue(tags: Record<string, string>, keys: string[]) {
  for (const key of keys) {
    const value = tags[key]?.trim();
    if (value) return value;
  }
  return null;
}

function addressFromTags(tags: Record<string, string>) {
  const street = [tags["addr:housenumber"], tags["addr:street"]].filter(Boolean).join(" ").trim();
  const parts = [
    street,
    tags["addr:city"],
    tags["addr:state"],
    tags["addr:postcode"],
    tags["addr:country"],
  ].filter(Boolean);
  return parts.length ? parts.join(", ") : null;
}

function socialProfilesFromTags(tags: Record<string, string>) {
  return uniqueStrings([
    tags["contact:facebook"],
    tags.facebook,
    tags["contact:instagram"],
    tags.instagram,
    tags["contact:twitter"],
    tags.twitter,
    tags["contact:linkedin"],
    tags.linkedin,
  ]);
}

function escapeOverpass(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function buildAreaClause(location: LeadIntelligenceLocationCriteria) {
  if (location.latitude != null && location.longitude != null) {
    const radiusMeters = Math.round((location.radiusMiles ?? 15) * 1609.344);
    return `(around:${radiusMeters},${location.latitude},${location.longitude})`;
  }
  if (location.boundingBox) {
    const box = location.boundingBox;
    return `(${box.south},${box.west},${box.north},${box.east})`;
  }
  return "";
}

function buildOverpassQuery(criteria: LeadIntelligenceSearchCriteria) {
  const mappings = resolveOsmCategoryMappings(criteria.categories);
  const clauses: string[] = [];
  for (const location of criteria.locations) {
    const area = buildAreaClause(location);
    if (!area) continue;
    for (const mapping of mappings) {
      for (const tag of mapping.tags) {
        const filter = tag.value ? `["${escapeOverpass(tag.key)}"="${escapeOverpass(tag.value)}"]` : `["${escapeOverpass(tag.key)}"]`;
        clauses.push(`node${filter}${area};`);
        clauses.push(`way${filter}${area};`);
        clauses.push(`relation${filter}${area};`);
      }
    }
  }
  return `[out:json][timeout:25];(${clauses.join("")});out center tags ${criteria.limit};`;
}

function businessFromOverpass(element: OverpassElement, categories: string[]): LeadIntelligenceBusiness | null {
  const tags = element.tags ?? {};
  const name = osmValue(tags, ["name", "brand", "operator"]);
  if (!name) return null;
  const website = osmValue(tags, ["website", "contact:website", "url"]);
  const phone = osmValue(tags, ["phone", "contact:phone"]);
  const email = osmValue(tags, ["email", "contact:email"]);
  const latitude = element.lat ?? element.center?.lat ?? null;
  const longitude = element.lon ?? element.center?.lon ?? null;
  const providerId = `osm:${element.type}/${element.id}`;
  return {
    name,
    normalizedName: normalizeText(name),
    categories: uniqueStrings([
      ...categories,
      tags.amenity,
      tags.shop,
      tags.office,
      tags.craft,
      tags.healthcare,
      tags.leisure,
      tags.tourism,
    ]),
    address: addressFromTags(tags),
    city: tags["addr:city"] ?? null,
    state: tags["addr:state"] ?? null,
    postalCode: tags["addr:postcode"] ?? null,
    country: tags["addr:country"] ?? null,
    latitude,
    longitude,
    phone,
    email,
    website,
    socialProfiles: socialProfilesFromTags(tags),
    providerIds: [providerId],
  };
}

export class OpenStreetMapOverpassProvider implements ILeadDiscoveryProvider {
  providerKey = "openstreetmap-overpass";

  constructor(private config: LeadIntelligenceProviderConfig) {}

  async search(criteriaInput: LeadIntelligenceSearchCriteria, context: ProviderExecutionContext): Promise<ProviderSearchResult> {
    const criteria = normalizeSearchCriteria(criteriaInput);
    const requestedAt = context.now;
    const query = buildOverpassQuery(criteria);
    if (!query.includes("node") && !query.includes("way")) {
      return {
        providerKey: this.providerKey,
        rawResponseId: null,
        results: [],
        providerStats: {
          providerKey: this.providerKey,
          status: "skipped",
          requestedAt,
          completedAt: new Date().toISOString(),
          requestCount: 0,
          resultCount: 0,
          costUsd: 0,
          cacheHit: false,
          message: "No geocoded search area was available for Overpass.",
        },
      };
    }

    const signal = timeoutSignal(Math.min(this.config.timeoutMs, context.timeoutMs));
    try {
      const res = await fetch(this.config.endpoint, {
        method: "POST",
        cache: "no-store",
        signal: signal.controller.signal,
        headers: {
          "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
          "User-Agent": context.userAgent,
        },
        body: new URLSearchParams({ data: query }).toString(),
      });
      if (!res.ok) throw new Error(`Overpass request failed with HTTP ${res.status}`);
      const body = await res.json() as OverpassResponse;
      if (body.remark) throw new Error(body.remark);

      const categories = resolveOsmCategoryMappings(criteria.categories).map((mapping) => mapping.label);
      const seen = new Set<string>();
      const results: LeadIntelligenceSearchResult[] = [];
      for (const element of body.elements ?? []) {
        const business = businessFromOverpass(element, categories);
        if (!business) continue;
        const businessKey = businessKeyFor(business);
        if (seen.has(businessKey)) continue;
        seen.add(businessKey);
        const findings = buildInitialFindings(business);
        const score = scoreBusiness(business, findings);
        results.push({
          _id: leadIntelligenceId("result"),
          _type: "leadIntelligenceSearchResult",
          searchId: "",
          runId: "",
          businessKey,
          business,
          status: business.website ? "website-found" : "opportunity-scored",
          sources: [{
            providerKey: this.providerKey,
            providerRecordId: business.providerIds[0],
            sourceUrl: `https://www.openstreetmap.org/${element.type}/${element.id}`,
            dataType: "business-discovery",
            retrievedAt: context.now,
            confidence: score.confidence,
            attribution: this.config.attribution,
            licenseNote: "OpenStreetMap data requires attribution and license review before production activation.",
            freshness: "current",
          }],
          findings,
          score,
          dismissed: false,
          doNotContact: false,
          savedToListIds: [],
          convertedPipelineContactId: null,
          lastVerifiedAt: context.now,
        });
        if (results.length >= criteria.limit) break;
      }

      return {
        providerKey: this.providerKey,
        rawResponseId: null,
        results,
        providerStats: {
          providerKey: this.providerKey,
          status: "success",
          requestedAt,
          completedAt: new Date().toISOString(),
          requestCount: 1,
          resultCount: results.length,
          costUsd: 0,
          cacheHit: false,
          message: `Found ${results.length} OpenStreetMap business result${results.length === 1 ? "" : "s"}.`,
        },
      };
    } catch (err) {
      return {
        providerKey: this.providerKey,
        rawResponseId: null,
        results: [],
        providerStats: {
          providerKey: this.providerKey,
          status: "failed",
          requestedAt,
          completedAt: new Date().toISOString(),
          requestCount: 1,
          resultCount: 0,
          costUsd: 0,
          cacheHit: false,
          message: err instanceof Error ? err.message : "OpenStreetMap discovery failed.",
        },
      };
    } finally {
      signal.done();
    }
  }
}

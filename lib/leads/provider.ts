import { createHash } from "crypto";
import type { LeadCandidateInput } from "./types";
import { buildOutreachEmail } from "./emailTemplates";
import { researchedSeedLeads } from "./researchedSeedLeads";
import {
  DEFAULT_LEAD_SEARCH_CATEGORIES,
  DEFAULT_LEAD_SEARCH_LOCATIONS,
  OPEN_LEAD_SEARCH_CATEGORIES,
} from "./searchCriteria";

type GooglePlaceSearchResult = {
  place_id?: string;
  name?: string;
  formatted_address?: string;
  business_status?: string;
  types?: string[];
};

type GooglePlaceDetails = {
  name?: string;
  formatted_address?: string;
  formatted_phone_number?: string;
  website?: string;
  url?: string;
  business_status?: string;
  types?: string[];
};

type GooglePlaceSearchResponse = {
  results?: GooglePlaceSearchResult[];
  next_page_token?: string;
  status?: string;
  error_message?: string;
};

type LeadIdentity = Pick<
  LeadCandidateInput,
  "_id" | "businessName" | "address" | "city" | "contactUrl" | "website" | "sourceUrl"
>;

type DiscoverLeadCandidatesOptions = {
  existingLeads?: LeadIdentity[];
  searchLocations?: string[];
  searchCategories?: string[];
};

const FETCH_TIMEOUT_MS = 10_000;
const DISCOVERY_TIME_BUDGET_MS = 180_000;
const MIN_DISCOVERY_TIME_REMAINING_MS = 15_000;
const MAX_PAGES_PER_QUERY = 1;

function googlePlaceCandidateId(placeId: string) {
  const hash = createHash("sha1").update(placeId).digest("hex").slice(0, 20);
  return `lead-candidate-google-${hash}`;
}

function normalizeIdentity(value: string | null | undefined) {
  return value?.trim().toLowerCase().replace(/\s+/g, " ") || "";
}

function normalizeUrl(value: string | null | undefined) {
  const raw = value?.trim();
  if (!raw) return "";

  try {
    const url = new URL(raw);
    const hostname = url.hostname.toLowerCase().replace(/^www\./, "");
    const pathname = url.pathname.replace(/\/+$/, "");
    return `${hostname}${pathname}`;
  } catch {
    return normalizeIdentity(raw).replace(/^https?:\/\/(www\.)?/, "").replace(/\/+$/, "");
  }
}

function leadIdentityKeys(lead: LeadIdentity) {
  const keys = new Set<string>();
  if (lead._id) keys.add(`id:${lead._id}`);

  for (const url of [lead.website, lead.contactUrl, lead.sourceUrl]) {
    const normalizedUrl = normalizeUrl(url);
    if (normalizedUrl) keys.add(`url:${normalizedUrl}`);
  }

  const businessName = normalizeIdentity(lead.businessName);
  const address = normalizeIdentity(lead.address);
  const city = normalizeIdentity(lead.city);
  if (businessName && address) keys.add(`name-address:${businessName}|${address}`);
  if (businessName && city) keys.add(`name-city:${businessName}|${city}`);

  return keys;
}

function buildKnownLeadKeys(leads: LeadIdentity[] = []) {
  const known = new Set<string>();
  for (const lead of leads) {
    for (const key of leadIdentityKeys(lead)) known.add(key);
  }
  return known;
}

function hasKnownLead(lead: LeadIdentity, known: Set<string>) {
  for (const key of leadIdentityKeys(lead)) {
    if (known.has(key)) return true;
  }
  return false;
}

function rememberLead(lead: LeadIdentity, known: Set<string>) {
  for (const key of leadIdentityKeys(lead)) known.add(key);
}

function classifyRegion(address: string): LeadCandidateInput["region"] {
  const lower = address.toLowerCase();
  if (lower.includes("richmond")) return "Richmond";
  if (lower.includes("norfolk") || lower.includes("hampton") || lower.includes("chesapeake")) return "Hampton Roads";
  if (lower.includes("virginia beach") || lower.includes("portsmouth") || lower.includes("suffolk")) return "Tidewater";
  return "Virginia";
}

function cityFromAddress(address: string) {
  const parts = address.split(",").map((part) => part.trim()).filter(Boolean);
  return parts.length >= 2 ? parts[1] : "Virginia";
}

function mapPlaceToLead(place: GooglePlaceDetails, sourceUrl: string, placeId: string): LeadCandidateInput | null {
  if (!place.name || place.business_status !== "OPERATIONAL") return null;

  const address = place.formatted_address ?? null;
  const niche = (place.types ?? [])
    .filter((type) => !["point_of_interest", "establishment"].includes(type))
    .slice(0, 3)
    .map((type) => type.replace(/_/g, " "))
    .join(", ") || "Local service business";

  const city = address ? cityFromAddress(address) : "Virginia";
  const region = address ? classifyRegion(address) : "Virginia";
  const outreach = buildOutreachEmail({ businessName: place.name, city, region, niche });

  return {
    _id: googlePlaceCandidateId(placeId),
    businessName: place.name,
    niche,
    city,
    region,
    address,
    phone: place.formatted_phone_number ?? null,
    email: null,
    emails: null,
    contactUrl: place.website ?? place.url ?? null,
    website: place.website ?? null,
    sourceUrl,
    status: "review",
    openStatus: "open",
    fitScore: 65,
    leadSource: "Google Places",
    currentSnapshot: "Operational business found through Google Places.",
    gapAssessment: "Review the website and contact flow for opportunities around inquiry capture, scheduling, portals, dashboards, or automation.",
    howCel3CanHelp: "CEL3 can assess the current web presence and recommend a clearer lead, booking, or operations workflow.",
    emailSubject: outreach.subject,
    emailBodyHtml: outreach.bodyHtml,
    notes: null,
    reviewedAt: null,
    approvedPipelineContactId: null,
    emailedAt: null,
  };
}

async function fetchJson<T>(url: string) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { cache: "no-store", signal: controller.signal });
    if (!res.ok) {
      throw new Error(`Google Places request failed with HTTP ${res.status}`);
    }
    return res.json() as Promise<T>;
  } finally {
    clearTimeout(timer);
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildSearchUrl(apiKey: string, query: string, pageToken?: string) {
  const searchUrl = new URL("https://maps.googleapis.com/maps/api/place/textsearch/json");
  searchUrl.searchParams.set("key", apiKey);
  if (pageToken) {
    searchUrl.searchParams.set("pagetoken", pageToken);
  } else {
    searchUrl.searchParams.set("query", query);
  }
  return searchUrl;
}

function normalizedList(values: string[] | undefined, fallback: string[]) {
  const next = Array.from(new Set(
    (values?.length ? values : fallback)
      .map((value) => value.trim())
      .filter(Boolean)
  ));
  return next.length ? next : fallback;
}

function buildQueries(options: DiscoverLeadCandidatesOptions) {
  const locations = normalizedList(options.searchLocations, DEFAULT_LEAD_SEARCH_LOCATIONS);
  const categories = options.searchCategories
    ? normalizedList(options.searchCategories, OPEN_LEAD_SEARCH_CATEGORIES)
    : DEFAULT_LEAD_SEARCH_CATEGORIES;
  return locations.flatMap((location) => categories.map((category) => `${category} ${location}`));
}

async function fetchSearchPage(apiKey: string, query: string, pageToken?: string) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const search = await fetchJson<GooglePlaceSearchResponse>(buildSearchUrl(apiKey, query, pageToken).toString());
    if (pageToken && search.status === "INVALID_REQUEST" && attempt < 2) {
      await sleep(1000);
      continue;
    }
    if (pageToken && search.status === "INVALID_REQUEST") {
      return null;
    }
    return search;
  }
  throw new Error("Google Places page token was not ready.");
}

export async function discoverLeadCandidates(maxPerRun: number, options: DiscoverLeadCandidatesOptions = {}) {
  const startedAt = Date.now();
  const targetCount = Math.max(maxPerRun, 0);
  const known = buildKnownLeadKeys(options.existingLeads);
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  const queries = buildQueries(options);

  if (!apiKey) {
    const fallbackLeads = researchedSeedLeads.filter((lead) => !hasKnownLead(lead, known)).slice(0, targetCount);
    return {
      ok: true,
      message: `Google Places is not configured, so loaded ${fallbackLeads.length} new researched lead candidate${fallbackLeads.length === 1 ? "" : "s"} instead.`,
      leads: fallbackLeads,
    };
  }

  const leads: LeadCandidateInput[] = [];
  const seen = new Set<string>();
  let stoppedForTime = false;

  for (const query of queries) {
    if (leads.length >= targetCount) break;
    if (Date.now() - startedAt > DISCOVERY_TIME_BUDGET_MS - MIN_DISCOVERY_TIME_REMAINING_MS) {
      stoppedForTime = true;
      break;
    }

    let pageToken: string | undefined;
    for (let page = 0; page < MAX_PAGES_PER_QUERY && leads.length < targetCount; page++) {
      if (Date.now() - startedAt > DISCOVERY_TIME_BUDGET_MS - MIN_DISCOVERY_TIME_REMAINING_MS) {
        stoppedForTime = true;
        break;
      }
      if (pageToken) await sleep(2000);

      const search = await fetchSearchPage(apiKey, query, pageToken);
      if (!search) break;
      if (search.status && !["OK", "ZERO_RESULTS"].includes(search.status)) {
        throw new Error(
          search.error_message ||
            `Google Places request failed with status ${search.status}. Check that the key can use the Places API Text Search endpoint.`
        );
      }

      for (const result of search.results ?? []) {
        if (!result.place_id || seen.has(result.place_id) || leads.length >= targetCount) continue;
        if (Date.now() - startedAt > DISCOVERY_TIME_BUDGET_MS - MIN_DISCOVERY_TIME_REMAINING_MS) {
          stoppedForTime = true;
          break;
        }
        seen.add(result.place_id);
        if (known.has(`id:${googlePlaceCandidateId(result.place_id)}`)) continue;

        const detailsUrl = new URL("https://maps.googleapis.com/maps/api/place/details/json");
        detailsUrl.searchParams.set("place_id", result.place_id);
        detailsUrl.searchParams.set("fields", "name,formatted_address,formatted_phone_number,website,url,business_status,types");
        detailsUrl.searchParams.set("key", apiKey);

        const details = await fetchJson<{ result?: GooglePlaceDetails }>(detailsUrl.toString());
        const lead = details.result ? mapPlaceToLead(details.result, details.result.url ?? buildSearchUrl(apiKey, query).toString(), result.place_id) : null;
        if (lead && !hasKnownLead(lead, known)) {
          leads.push(lead);
          rememberLead(lead, known);
        }
      }

      pageToken = search.next_page_token;
      if (!pageToken) break;
    }
  }

  return {
    ok: true,
    message: leads.length >= targetCount
      ? `Discovered ${leads.length} new lead candidates.`
      : stoppedForTime
        ? `Discovered ${leads.length} new lead candidate${leads.length === 1 ? "" : "s"} before this run hit its time budget. Run it again for more.`
      : `Discovered ${leads.length} new lead candidate${leads.length === 1 ? "" : "s"} before the current Places search pool was exhausted.`,
    leads,
  };
}

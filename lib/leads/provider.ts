import { createHash } from "crypto";
import type { LeadCandidateInput } from "./types";
import { buildOutreachEmail } from "./emailTemplates";
import { discoverLeadEmails } from "./emailDiscovery";
import { researchedSeedLeads } from "./researchedSeedLeads";

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
};

const DEFAULT_QUERIES = [
  "yoga studio Richmond VA",
  "event venue Richmond VA",
  "arts education Richmond VA",
  "wellness studio Norfolk VA",
  "fitness studio Virginia Beach VA",
  "event venue Hampton Roads VA",
];

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
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Google Places request failed with HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
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
  const targetCount = Math.max(maxPerRun, 0);
  const known = buildKnownLeadKeys(options.existingLeads);
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;

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

  for (const query of DEFAULT_QUERIES) {
    if (leads.length >= targetCount) break;

    let pageToken: string | undefined;
    for (let page = 0; page < 3 && leads.length < targetCount; page++) {
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
        seen.add(result.place_id);
        if (known.has(`id:${googlePlaceCandidateId(result.place_id)}`)) continue;

        const detailsUrl = new URL("https://maps.googleapis.com/maps/api/place/details/json");
        detailsUrl.searchParams.set("place_id", result.place_id);
        detailsUrl.searchParams.set("fields", "name,formatted_address,formatted_phone_number,website,url,business_status,types");
        detailsUrl.searchParams.set("key", apiKey);

        const details = await fetchJson<{ result?: GooglePlaceDetails }>(detailsUrl.toString());
        const lead = details.result ? mapPlaceToLead(details.result, details.result.url ?? buildSearchUrl(apiKey, query).toString(), result.place_id) : null;
        if (lead && !hasKnownLead(lead, known)) {
          // Places has no email field - crawl the business site for public addresses.
          const emails = await discoverLeadEmails({
            website: lead.website,
            contactUrl: lead.contactUrl,
          });
          lead.email = emails[0] ?? null;
          lead.emails = emails.length ? emails : null;
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
    message: `Discovered ${leads.length} lead candidate${leads.length === 1 ? "" : "s"}.`,
    leads,
  };
}

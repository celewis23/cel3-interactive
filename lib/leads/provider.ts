import type { LeadCandidateInput } from "./types";
import { buildOutreachEmail } from "./emailTemplates";
import { discoverLeadEmails } from "./emailDiscovery";

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

const DEFAULT_QUERIES = [
  "yoga studio Richmond VA",
  "event venue Richmond VA",
  "arts education Richmond VA",
  "wellness studio Norfolk VA",
  "fitness studio Virginia Beach VA",
  "event venue Hampton Roads VA",
];

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

function mapPlaceToLead(place: GooglePlaceDetails, sourceUrl: string): LeadCandidateInput | null {
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

export async function discoverLeadCandidates(maxPerRun: number) {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    return {
      ok: false,
      message: "GOOGLE_PLACES_API_KEY is not configured. Seeded research can still be reviewed manually.",
      leads: [] as LeadCandidateInput[],
    };
  }

  const leads: LeadCandidateInput[] = [];
  const seen = new Set<string>();

  for (const query of DEFAULT_QUERIES) {
    if (leads.length >= maxPerRun) break;

    const searchUrl = new URL("https://maps.googleapis.com/maps/api/place/textsearch/json");
    searchUrl.searchParams.set("query", query);
    searchUrl.searchParams.set("key", apiKey);

    const search = await fetchJson<{ results?: GooglePlaceSearchResult[] }>(searchUrl.toString());
    for (const result of search.results ?? []) {
      if (!result.place_id || seen.has(result.place_id) || leads.length >= maxPerRun) continue;
      seen.add(result.place_id);

      const detailsUrl = new URL("https://maps.googleapis.com/maps/api/place/details/json");
      detailsUrl.searchParams.set("place_id", result.place_id);
      detailsUrl.searchParams.set("fields", "name,formatted_address,formatted_phone_number,website,url,business_status,types");
      detailsUrl.searchParams.set("key", apiKey);

      const details = await fetchJson<{ result?: GooglePlaceDetails }>(detailsUrl.toString());
      const lead = details.result ? mapPlaceToLead(details.result, details.result.url ?? searchUrl.toString()) : null;
      if (lead) {
        // Places has no email field — crawl the business site for public addresses
        const emails = await discoverLeadEmails({
          website: lead.website,
          contactUrl: lead.contactUrl,
        });
        lead.email = emails[0] ?? null;
        lead.emails = emails.length ? emails : null;
        leads.push(lead);
      }
    }
  }

  return {
    ok: true,
    message: `Discovered ${leads.length} lead candidate${leads.length === 1 ? "" : "s"}.`,
    leads,
  };
}

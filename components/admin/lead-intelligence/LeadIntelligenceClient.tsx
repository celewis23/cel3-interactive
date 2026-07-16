"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type {
  LeadIntelligenceProviderConfig,
  LeadIntelligenceSearch,
  LeadIntelligenceSearchResult,
} from "@/lib/lead-intelligence/types";

type UsageSummary = {
  windowDays: number;
  requests: number;
  results: number;
  costUsd: number;
  avoidedGoogleCostUsd: number;
  byProvider: Array<{ providerKey: string; requests: number; results: number; costUsd: number; failures: number }>;
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

type EnrichmentDraft = {
  name: string;
  website: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  reviewNotes: string;
};

type OutreachDraft = {
  subject: string;
  bodyHtml: string;
};

type ParsedCriteria = {
  category: string;
  location: string;
  radiusMiles: number;
  websiteFilters: string[];
  contactFilters: string[];
  opportunityFilters: string[];
};

const SECTIONS = [
  "Lead Search",
  "Search History",
  "Lead Results",
  "Lead Profiles",
  "Website Audits",
  "Lead Lists",
  "Enrichment Queue",
  "Outreach Studio",
  "Data Sources",
  "Usage and Costs",
  "Settings",
];

function parseClientQuery(query: string): ParsedCriteria {
  const cleaned = query.trim();
  const inMatch = cleaned.match(/^(.+?)\s+(?:in|near|around|within)\s+(.+)$/i);
  let category = inMatch?.[1]?.trim() || cleaned || "Restaurant";
  let location = inMatch?.[2]?.trim() || "Richmond, Virginia";
  const radiusMatch = cleaned.match(/within\s+(\d+)\s*(?:miles?|mi)\b/i);
  const radiusMiles = radiusMatch ? Number(radiusMatch[1]) : 15;
  if (radiusMatch) location = location.replace(radiusMatch[0], "").replace(/^\s+of\s+/i, "").trim() || location;

  const lower = cleaned.toLowerCase();
  const websiteFilters: string[] = [];
  const contactFilters: string[] = [];
  const opportunityFilters: string[] = [];
  if (lower.includes("no website") || lower.includes("without a website") || lower.includes("missing website")) websiteFilters.push("missing-website");
  if (lower.includes("outdated website") || lower.includes("poor mobile")) websiteFilters.push("weak-website");
  if (lower.includes("without email") || lower.includes("missing email") || lower.includes("visible email")) contactFilters.push("missing-email");
  if (lower.includes("booking")) opportunityFilters.push("missing-online-booking");
  if (lower.includes("ordering")) opportunityFilters.push("missing-online-ordering");
  if (lower.includes("giving")) opportunityFilters.push("missing-online-giving");
  category = category.replace(/with(?:out)? .+$/i, "").replace(/using wix/i, "").trim() || "Business";
  return { category, location, radiusMiles, websiteFilters, contactFilters, opportunityFilters };
}

function statusClass(status: string) {
  if (status === "completed" || status === "healthy") return "bg-emerald-400/10 text-emerald-300";
  if (status === "running") return "bg-sky-400/10 text-sky-300";
  if (status === "cached" || status === "unreviewed") return "bg-amber-400/10 text-amber-300";
  if (status === "failed") return "bg-red-400/10 text-red-300";
  return "bg-white/8 text-white/45";
}

function scoreClass(score: number) {
  if (score >= 75) return "text-emerald-300";
  if (score >= 55) return "text-amber-200";
  return "text-white/45";
}

function sourceLabel(result: LeadIntelligenceSearchResult) {
  return result.sources.map((source) => source.providerKey).join(", ") || "unknown";
}

function dispositionLabel(result: LeadIntelligenceSearchResult) {
  if (result.convertedPipelineContactId) return "converted";
  if (result.doNotContact) return "do not contact";
  if (result.dismissed) return "dismissed";
  if (result.reviewedAt) return "reviewed";
  return "new";
}

function dispositionClass(result: LeadIntelligenceSearchResult) {
  if (result.convertedPipelineContactId) return "bg-emerald-400/10 text-emerald-300";
  if (result.doNotContact) return "bg-red-400/10 text-red-300";
  if (result.dismissed) return "bg-white/6 text-white/35";
  if (result.reviewedAt) return "bg-sky-400/10 text-sky-300";
  return "bg-amber-400/10 text-amber-300";
}

function fmtDate(value: string | null | undefined) {
  if (!value) return "Never";
  return new Date(value).toLocaleString();
}

export default function LeadIntelligenceClient({
  initialSearches,
  initialProviders,
  initialUsage,
  initialResults,
}: {
  initialSearches: LeadIntelligenceSearch[];
  initialProviders: LeadIntelligenceProviderConfig[];
  initialUsage: UsageSummary;
  initialResults: LeadIntelligenceSearchResult[];
}) {
  const [query, setQuery] = useState("Dentists in Richmond, Virginia");
  const [parsed, setParsed] = useState<ParsedCriteria>(() => parseClientQuery("Dentists in Richmond, Virginia"));
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [limit, setLimit] = useState(50);
  const [searches, setSearches] = useState(initialSearches);
  const [results, setResults] = useState(initialResults);
  const [usage, setUsage] = useState(initialUsage);
  const [providers] = useState(initialProviders);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [running, setRunning] = useState(false);
  const [convertingId, setConvertingId] = useState("");
  const [selectedResultId, setSelectedResultId] = useState(initialResults[0]?._id ?? "");
  const [possibleMatches, setPossibleMatches] = useState<{ result: LeadIntelligenceSearchResult; matches: PipelineMatch[] } | null>(null);
  const [updatingResultId, setUpdatingResultId] = useState("");
  const [enrichmentDraft, setEnrichmentDraft] = useState<EnrichmentDraft>({
    name: "",
    website: "",
    phone: "",
    email: "",
    address: "",
    city: "",
    state: "",
    reviewNotes: "",
  });
  const [outreachDraft, setOutreachDraft] = useState<OutreachDraft>({ subject: "", bodyHtml: "" });
  const [outreachActionId, setOutreachActionId] = useState("");

  const estimatedCost = useMemo(() => {
    const enabled = providers.filter((provider) => provider.enabled && ["openstreetmap-overpass"].includes(provider.providerKey));
    return enabled.reduce((sum, provider) => sum + provider.estimatedCostPerRequestUsd, 0);
  }, [providers]);

  const selectedResult = useMemo(() => {
    return results.find((result) => result._id === selectedResultId) ?? results[0] ?? null;
  }, [results, selectedResultId]);

  const resultLists = useMemo(() => {
    const active = results.filter((result) => !result.dismissed && !result.doNotContact && !result.convertedPipelineContactId);
    return {
      active,
      reviewed: results.filter((result) => Boolean(result.reviewedAt)),
      dismissed: results.filter((result) => result.dismissed),
      doNotContact: results.filter((result) => result.doNotContact),
      highOpportunity: active.filter((result) => result.score.leadScore >= 70),
      needsWebsite: active.filter((result) => !result.business.website),
      needsContact: active.filter((result) => !result.business.email || !result.business.phone),
      readyForReview: active.filter((result) => !result.reviewedAt),
    };
  }, [results]);

  useEffect(() => {
    if (!selectedResult) {
      setEnrichmentDraft({
        name: "",
        website: "",
        phone: "",
        email: "",
        address: "",
        city: "",
        state: "",
        reviewNotes: "",
      });
      setOutreachDraft({ subject: "", bodyHtml: "" });
      return;
    }
    setEnrichmentDraft({
      name: selectedResult.business.name ?? "",
      website: selectedResult.business.website ?? "",
      phone: selectedResult.business.phone ?? "",
      email: selectedResult.business.email ?? "",
      address: selectedResult.business.address ?? "",
      city: selectedResult.business.city ?? "",
      state: selectedResult.business.state ?? "",
      reviewNotes: selectedResult.reviewNotes ?? "",
    });
    setOutreachDraft({
      subject: selectedResult.outreachSubject ?? "",
      bodyHtml: selectedResult.outreachBodyHtml ?? "",
    });
  }, [selectedResult?._id]);

  function refreshDerived(data: {
    search: LeadIntelligenceSearch;
    results: LeadIntelligenceSearchResult[];
    cacheHit: boolean;
  }) {
    setSearches((prev) => [data.search, ...prev.filter((search) => search._id !== data.search._id)].slice(0, 20));
    setResults(data.results);
    setSelectedResultId(data.results[0]?._id ?? "");
    setPossibleMatches(null);
    setMessage(data.cacheHit ? "Used recent cached results for an equivalent search." : data.search.lastRunMessage || "Search completed.");
  }

  async function runSearch() {
    setRunning(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch("/api/admin/lead-intelligence/searches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          runImmediately: true,
          naturalLanguageQuery: query,
          criteria: {
            locations: [{ query: parsed.location, radiusMiles: parsed.radiusMiles }],
            categories: [parsed.category],
            websiteFilters: parsed.websiteFilters,
            contactFilters: parsed.contactFilters,
            opportunityFilters: parsed.opportunityFilters,
            providers: ["openstreetmap-overpass"],
            costMode: "free-only",
            limit,
            sort: "best-opportunity",
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Search failed");
      refreshDerived(data);
      const usageRes = await fetch("/api/admin/lead-intelligence/usage");
      if (usageRes.ok) {
        const usageData = await usageRes.json();
        setUsage(usageData.usage);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setRunning(false);
    }
  }

  async function convertToCrm(result: LeadIntelligenceSearchResult, force = false) {
    setConvertingId(result._id);
    setError("");
    setMessage("");
    if (!force) setPossibleMatches(null);
    try {
      const res = await fetch(`/api/admin/lead-intelligence/leads/${encodeURIComponent(result._id)}/convert-to-crm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "CRM conversion failed");
      if (data.possibleMatches?.length) {
        setPossibleMatches({ result, matches: data.possibleMatches });
        setMessage(`Possible CRM match found for ${result.business.name}. Review the existing pipeline before forcing conversion.`);
        return;
      }
      setResults((prev) => prev.map((item) => item._id === result._id ? { ...item, convertedPipelineContactId: data.contactId } : item));
      setPossibleMatches(null);
      setMessage(data.created ? "Lead converted to pipeline." : "Lead is already linked to pipeline.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "CRM conversion failed");
    } finally {
      setConvertingId("");
    }
  }

  async function patchResult(result: LeadIntelligenceSearchResult, patch: {
    dismissed?: boolean;
    doNotContact?: boolean;
    reviewed?: boolean;
    reviewNotes?: string | null;
    outreachSubject?: string | null;
    outreachBodyHtml?: string | null;
    business?: Partial<LeadIntelligenceSearchResult["business"]>;
  }, successMessage: string) {
    setUpdatingResultId(result._id);
    setError("");
    setMessage("");
    try {
      const res = await fetch(`/api/admin/lead-intelligence/leads/${encodeURIComponent(result._id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lead update failed");
      setResults((prev) => prev.map((item) => item._id === result._id ? data.result : item));
      setMessage(successMessage);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lead update failed");
    } finally {
      setUpdatingResultId("");
    }
  }

  async function saveEnrichment(result: LeadIntelligenceSearchResult) {
    await patchResult(result, {
      reviewed: true,
      reviewNotes: enrichmentDraft.reviewNotes,
      business: {
        name: enrichmentDraft.name,
        website: enrichmentDraft.website,
        phone: enrichmentDraft.phone,
        email: enrichmentDraft.email,
        address: enrichmentDraft.address,
        city: enrichmentDraft.city,
        state: enrichmentDraft.state,
      },
    }, "Lead enrichment saved.");
  }

  async function generateOutreach(result: LeadIntelligenceSearchResult) {
    setOutreachActionId(result._id);
    setError("");
    setMessage("");
    try {
      const res = await fetch(`/api/admin/lead-intelligence/leads/${encodeURIComponent(result._id)}/outreach`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generate" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Outreach draft failed");
      setResults((prev) => prev.map((item) => item._id === result._id ? data.result : item));
      setOutreachDraft({
        subject: data.result.outreachSubject ?? "",
        bodyHtml: data.result.outreachBodyHtml ?? "",
      });
      setMessage("Outreach draft generated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Outreach draft failed");
    } finally {
      setOutreachActionId("");
    }
  }

  async function saveOutreachDraft(result: LeadIntelligenceSearchResult) {
    await patchResult(result, {
      outreachSubject: outreachDraft.subject,
      outreachBodyHtml: outreachDraft.bodyHtml,
      reviewed: true,
    }, "Outreach draft saved.");
  }

  async function sendOutreach(result: LeadIntelligenceSearchResult) {
    setOutreachActionId(result._id);
    setError("");
    setMessage("");
    try {
      const res = await fetch(`/api/admin/lead-intelligence/leads/${encodeURIComponent(result._id)}/outreach`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "send",
          subject: outreachDraft.subject,
          htmlBody: outreachDraft.bodyHtml,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Outreach send failed");
      setResults((prev) => prev.map((item) => item._id === result._id ? data.result : item));
      setMessage("Outreach email sent.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Outreach send failed");
    } finally {
      setOutreachActionId("");
    }
  }

  return (
    <div className="-mx-4 space-y-6 px-4 pb-10 lg:-mx-8 lg:px-8">
      <div className="flex flex-col gap-4 border-b border-white/8 pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-sky-300/70">CEL3 Lead Intelligence</p>
          <h1 className="mt-2 text-3xl font-semibold text-white">Lead Intelligence</h1>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-white/45">
            Search public business data without Google by default, normalize source evidence, score opportunities, and move qualified accounts into the pipeline.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2 text-right">
          <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
            <p className="text-[11px] uppercase tracking-[0.16em] text-white/30">Cost</p>
            <p className="mt-1 text-lg font-semibold text-emerald-300">${usage.costUsd.toFixed(2)}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
            <p className="text-[11px] uppercase tracking-[0.16em] text-white/30">Results</p>
            <p className="mt-1 text-lg font-semibold text-white">{usage.results.toLocaleString()}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
            <p className="text-[11px] uppercase tracking-[0.16em] text-white/30">Avoided</p>
            <p className="mt-1 text-lg font-semibold text-sky-200">${usage.avoidedGoogleCostUsd.toFixed(2)}</p>
          </div>
        </div>
      </div>

      <div className="admin-scroll flex gap-2 overflow-x-auto pb-1">
        {SECTIONS.map((section) => (
          <a
            key={section}
            href={`#${section.toLowerCase().replace(/\s+/g, "-")}`}
            className="whitespace-nowrap rounded-full border border-white/10 px-3 py-1.5 text-xs text-white/45 transition-colors hover:border-white/20 hover:text-white"
          >
            {section}
          </a>
        ))}
      </div>

      {(message || error) && (
        <div className={`rounded-xl border px-4 py-3 text-sm ${error ? "border-red-400/20 bg-red-400/10 text-red-200" : "border-emerald-400/20 bg-emerald-400/10 text-emerald-200"}`}>
          {error || message}
        </div>
      )}

      <section id="lead-search" className="grid gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.7fr)]">
        <div className="rounded-2xl border border-white/10 bg-[#101010] p-5 shadow-2xl shadow-black/20">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">Lead Search</h2>
              <p className="mt-1 text-sm text-white/40">Natural-language search is parsed before any provider request runs.</p>
            </div>
            <button
              type="button"
              onClick={() => setAdvancedOpen((value) => !value)}
              className="rounded-xl border border-white/10 px-3 py-2 text-sm text-white/55 transition-colors hover:border-white/20 hover:text-white"
            >
              {advancedOpen ? "Simple mode" : "Advanced filters"}
            </button>
          </div>

          <label className="mt-5 block">
            <span className="mb-1 block text-xs text-white/45">Search</span>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="min-h-11 flex-1 rounded-xl border border-white/10 bg-black px-3 text-sm text-white outline-none transition-colors focus:border-sky-400/50"
                placeholder="Yoga studios without booking systems in Richmond, Virginia"
              />
              <button
                type="button"
                onClick={() => setParsed(parseClientQuery(query))}
                className="min-h-11 rounded-xl border border-white/10 px-4 text-sm font-medium text-white transition-colors hover:border-white/25"
              >
                Parse
              </button>
              <button
                type="button"
                onClick={runSearch}
                disabled={running}
                className="min-h-11 rounded-xl bg-sky-400 px-5 text-sm font-semibold text-black transition-colors hover:bg-sky-300 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {running ? "Searching..." : "Run Search"}
              </button>
            </div>
          </label>

          <div className="mt-5 grid gap-3 rounded-xl border border-white/10 bg-black/40 p-4 sm:grid-cols-3">
            <label className="block">
              <span className="mb-1 block text-xs text-white/35">Parsed category</span>
              <input
                value={parsed.category}
                onChange={(event) => setParsed({ ...parsed, category: event.target.value })}
                className="min-h-10 w-full rounded-lg border border-white/10 bg-black px-3 text-sm text-white outline-none"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-white/35">Parsed location</span>
              <input
                value={parsed.location}
                onChange={(event) => setParsed({ ...parsed, location: event.target.value })}
                className="min-h-10 w-full rounded-lg border border-white/10 bg-black px-3 text-sm text-white outline-none"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-white/35">Radius miles</span>
              <input
                type="number"
                min={1}
                max={100}
                value={parsed.radiusMiles}
                onChange={(event) => setParsed({ ...parsed, radiusMiles: Number(event.target.value) })}
                className="min-h-10 w-full rounded-lg border border-white/10 bg-black px-3 text-sm text-white outline-none"
              />
            </label>
            <div className="sm:col-span-3">
              <p className="text-xs uppercase tracking-[0.16em] text-white/25">Detected filters</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {[...parsed.websiteFilters, ...parsed.contactFilters, ...parsed.opportunityFilters].length ? (
                  [...parsed.websiteFilters, ...parsed.contactFilters, ...parsed.opportunityFilters].map((filter) => (
                    <span key={filter} className="rounded-full bg-sky-400/10 px-2.5 py-1 text-xs text-sky-200">{filter}</span>
                  ))
                ) : (
                  <span className="text-xs text-white/30">No special filters detected yet.</span>
                )}
              </div>
            </div>
          </div>

          {advancedOpen && (
            <div className="mt-4 grid gap-3 border-t border-white/8 pt-4 sm:grid-cols-2">
              <label>
                <span className="mb-1 block text-xs text-white/35">Result limit</span>
                <input
                  type="number"
                  min={1}
                  max={200}
                  value={limit}
                  onChange={(event) => setLimit(Number(event.target.value))}
                  className="min-h-10 w-full rounded-lg border border-white/10 bg-black px-3 text-sm text-white outline-none"
                />
              </label>
              <div>
                <span className="mb-1 block text-xs text-white/35">Cost mode</span>
                <div className="min-h-10 rounded-lg border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-sm text-emerald-200">
                  Free Only
                </div>
              </div>
            </div>
          )}
        </div>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-white/10 bg-[#101010] p-5">
            <h2 className="text-sm font-semibold text-white">Search Cost Preview</h2>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
                <p className="text-[11px] uppercase tracking-[0.16em] text-white/30">Mode</p>
                <p className="mt-1 text-sm font-semibold text-emerald-300">Free Only</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
                <p className="text-[11px] uppercase tracking-[0.16em] text-white/30">Estimate</p>
                <p className="mt-1 text-sm font-semibold text-white">${estimatedCost.toFixed(2)}</p>
              </div>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-white/35">
              This first provider path uses OpenStreetMap and Nominatim-compatible endpoints. Both are configured as zero marginal cost, but policy review and attribution remain visible before production-scale use.
            </p>
          </div>

          <div id="data-sources" className="rounded-2xl border border-white/10 bg-[#101010] p-5">
            <h2 className="text-sm font-semibold text-white">Data Sources</h2>
            <div className="mt-4 space-y-3">
              {providers.map((provider) => (
                <div key={provider.providerKey} className="rounded-xl border border-white/8 bg-black/30 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-white">{provider.label}</p>
                      <p className="mt-1 text-xs text-white/35">{provider.attribution}</p>
                    </div>
                    <span className={`rounded-full px-2 py-1 text-[11px] ${statusClass(provider.healthStatus)}`}>{provider.healthStatus}</span>
                  </div>
                  <p className="mt-2 truncate text-xs text-white/25">{provider.endpoint}</p>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </section>

      <section id="lead-results" className="rounded-2xl border border-white/10 bg-[#101010]">
        <div className="flex flex-col gap-2 border-b border-white/8 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">Lead Results</h2>
            <p className="mt-1 text-sm text-white/40">{results.length} normalized result{results.length === 1 ? "" : "s"} with source evidence and opportunity scoring.</p>
          </div>
        </div>
        <div className="admin-scroll overflow-x-auto">
          <table className="min-w-full divide-y divide-white/8 text-sm">
            <thead className="bg-white/[0.02] text-left text-xs uppercase tracking-[0.14em] text-white/30">
              <tr>
                <th className="px-5 py-3">Business</th>
                <th className="px-5 py-3">Score</th>
                <th className="px-5 py-3">Opportunity</th>
                <th className="px-5 py-3">Contact</th>
                <th className="px-5 py-3">Source</th>
                <th className="px-5 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/8">
              {results.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-sm text-white/35">
                    Run a search to see normalized business leads here.
                  </td>
                </tr>
              ) : results.map((result) => (
                <tr key={result._id} className={`align-top transition-colors hover:bg-white/[0.02] ${result.dismissed || result.doNotContact ? "opacity-55" : ""}`}>
                  <td className="px-5 py-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-white">{result.business.name}</p>
                      <span className={`rounded-full px-2 py-0.5 text-[11px] ${dispositionClass(result)}`}>{dispositionLabel(result)}</span>
                    </div>
                    <p className="mt-1 max-w-md text-xs text-white/35">{result.business.address || [result.business.city, result.business.state].filter(Boolean).join(", ") || "Address not provided"}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {result.business.categories.slice(0, 3).map((category) => (
                        <span key={category} className="rounded-full bg-white/6 px-2 py-0.5 text-[11px] text-white/45">{category}</span>
                      ))}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <p className={`text-lg font-semibold ${scoreClass(result.score.leadScore)}`}>{result.score.leadScore}</p>
                    <p className="text-xs text-white/30">{result.score.confidence}% confidence</p>
                  </td>
                  <td className="px-5 py-4">
                    <div className="space-y-1">
                      {result.findings.slice(0, 2).map((finding) => (
                        <p key={finding.key} className="text-xs text-white/55">{finding.label}</p>
                      ))}
                      {!result.findings.length && <p className="text-xs text-white/30">Needs enrichment</p>}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    {result.business.website ? (
                      <a href={result.business.website} target="_blank" rel="noreferrer" className="block max-w-[180px] truncate text-xs text-sky-300 hover:text-sky-200">
                        {result.business.website}
                      </a>
                    ) : <p className="text-xs text-white/25">No website</p>}
                    <p className="mt-1 text-xs text-white/35">{result.business.phone || "No phone"}</p>
                    <p className="mt-1 text-xs text-white/35">{result.business.email || "No email"}</p>
                  </td>
                  <td className="px-5 py-4">
                    <p className="text-xs text-white/45">{sourceLabel(result)}</p>
                    {result.sources[0]?.sourceUrl && (
                      <a href={result.sources[0].sourceUrl ?? "#"} target="_blank" rel="noreferrer" className="mt-1 block text-xs text-sky-300 hover:text-sky-200">
                        View source
                      </a>
                    )}
                  </td>
                  <td className="px-5 py-4 text-right">
                    {result.convertedPipelineContactId ? (
                      <Link href={`/admin/pipeline/contacts/${result.convertedPipelineContactId}`} className="text-xs text-emerald-300 hover:text-emerald-200">
                        Pipeline contact
                      </Link>
                    ) : (
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedResultId(result._id)}
                          className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-white/60 transition-colors hover:border-white/25 hover:text-white"
                        >
                          Review
                        </button>
                        <button
                          type="button"
                          onClick={() => convertToCrm(result)}
                          disabled={convertingId === result._id}
                          className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-white/60 transition-colors hover:border-white/25 hover:text-white disabled:opacity-50"
                        >
                          {convertingId === result._id ? "Converting..." : "Convert"}
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section id="lead-profiles" className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="rounded-2xl border border-white/10 bg-[#101010] p-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-white">Lead Profiles</h2>
                <p className="mt-1 text-sm text-white/40">Review the selected result before moving it into the pipeline.</p>
              </div>
            {selectedResult && (
              <span className={`w-fit rounded-full px-2.5 py-1 text-xs ${dispositionClass(selectedResult)}`}>
                {dispositionLabel(selectedResult)}
              </span>
            )}
          </div>

          {!selectedResult ? (
            <div className="mt-5 rounded-xl border border-dashed border-white/10 p-8 text-center text-sm text-white/35">
              Run a search, then select a result to build a lead profile.
            </div>
          ) : (
            <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,0.72fr)_minmax(280px,0.28fr)]">
              <div className="space-y-4">
                <div>
                  <h3 className="text-2xl font-semibold text-white">{selectedResult.business.name}</h3>
                  <p className="mt-1 text-sm text-white/40">
                    {selectedResult.business.address || [selectedResult.business.city, selectedResult.business.state].filter(Boolean).join(", ") || "Address not provided"}
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl border border-white/8 bg-black/25 p-3">
                    <p className="text-xs uppercase tracking-[0.14em] text-white/30">Lead score</p>
                    <p className={`mt-1 text-2xl font-semibold ${scoreClass(selectedResult.score.leadScore)}`}>{selectedResult.score.leadScore}</p>
                  </div>
                  <div className="rounded-xl border border-white/8 bg-black/25 p-3">
                    <p className="text-xs uppercase tracking-[0.14em] text-white/30">Opportunity</p>
                    <p className="mt-1 text-2xl font-semibold text-white">{selectedResult.score.opportunityScore}</p>
                  </div>
                  <div className="rounded-xl border border-white/8 bg-black/25 p-3">
                    <p className="text-xs uppercase tracking-[0.14em] text-white/30">Confidence</p>
                    <p className="mt-1 text-2xl font-semibold text-sky-200">{selectedResult.score.confidence}%</p>
                  </div>
                </div>

                <div className="rounded-xl border border-white/8 bg-black/25 p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-white/30">Opportunity signals</p>
                  <div className="mt-3 space-y-3">
                    {selectedResult.findings.length ? selectedResult.findings.map((finding) => (
                      <div key={finding.key} className="rounded-lg border border-white/8 bg-white/[0.02] p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-sm font-medium text-white">{finding.label}</p>
                          <span className="rounded-full bg-white/6 px-2 py-0.5 text-[11px] text-white/45">{finding.severity}</span>
                        </div>
                        <p className="mt-1 text-xs leading-relaxed text-white/40">{finding.evidence}</p>
                        <p className="mt-2 text-xs text-sky-200">{finding.recommendedService}</p>
                      </div>
                    )) : (
                      <p className="text-sm text-white/35">No major opportunity signal has been detected yet.</p>
                    )}
                  </div>
                </div>
              </div>

              <aside className="space-y-4">
                <div className="rounded-xl border border-white/8 bg-black/25 p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-white/30">Contact</p>
                  {selectedResult.business.website ? (
                    <a href={selectedResult.business.website} target="_blank" rel="noreferrer" className="mt-3 block truncate text-sm text-sky-300 hover:text-sky-200">
                      {selectedResult.business.website}
                    </a>
                  ) : (
                    <p className="mt-3 text-sm text-white/35">No website found</p>
                  )}
                  <p className="mt-2 text-sm text-white/45">{selectedResult.business.phone || "No phone found"}</p>
                  <p className="mt-1 text-sm text-white/45">{selectedResult.business.email || "No email found"}</p>
                </div>

                <div className="rounded-xl border border-white/8 bg-black/25 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs uppercase tracking-[0.16em] text-white/30">Manual enrichment</p>
                    {selectedResult.reviewedAt && (
                      <span className="text-[11px] text-sky-200">Reviewed {fmtDate(selectedResult.reviewedAt)}</span>
                    )}
                  </div>
                  <div className="mt-3 grid gap-2">
                    <input
                      value={enrichmentDraft.name}
                      onChange={(event) => setEnrichmentDraft({ ...enrichmentDraft, name: event.target.value })}
                      className="min-h-10 rounded-lg border border-white/10 bg-black px-3 text-sm text-white outline-none focus:border-sky-400/50"
                      placeholder="Business name"
                    />
                    <input
                      value={enrichmentDraft.website}
                      onChange={(event) => setEnrichmentDraft({ ...enrichmentDraft, website: event.target.value })}
                      className="min-h-10 rounded-lg border border-white/10 bg-black px-3 text-sm text-white outline-none focus:border-sky-400/50"
                      placeholder="Website"
                    />
                    <div className="grid gap-2 sm:grid-cols-2">
                      <input
                        value={enrichmentDraft.phone}
                        onChange={(event) => setEnrichmentDraft({ ...enrichmentDraft, phone: event.target.value })}
                        className="min-h-10 rounded-lg border border-white/10 bg-black px-3 text-sm text-white outline-none focus:border-sky-400/50"
                        placeholder="Phone"
                      />
                      <input
                        value={enrichmentDraft.email}
                        onChange={(event) => setEnrichmentDraft({ ...enrichmentDraft, email: event.target.value })}
                        className="min-h-10 rounded-lg border border-white/10 bg-black px-3 text-sm text-white outline-none focus:border-sky-400/50"
                        placeholder="Email"
                      />
                    </div>
                    <input
                      value={enrichmentDraft.address}
                      onChange={(event) => setEnrichmentDraft({ ...enrichmentDraft, address: event.target.value })}
                      className="min-h-10 rounded-lg border border-white/10 bg-black px-3 text-sm text-white outline-none focus:border-sky-400/50"
                      placeholder="Address"
                    />
                    <div className="grid gap-2 sm:grid-cols-2">
                      <input
                        value={enrichmentDraft.city}
                        onChange={(event) => setEnrichmentDraft({ ...enrichmentDraft, city: event.target.value })}
                        className="min-h-10 rounded-lg border border-white/10 bg-black px-3 text-sm text-white outline-none focus:border-sky-400/50"
                        placeholder="City"
                      />
                      <input
                        value={enrichmentDraft.state}
                        onChange={(event) => setEnrichmentDraft({ ...enrichmentDraft, state: event.target.value })}
                        className="min-h-10 rounded-lg border border-white/10 bg-black px-3 text-sm text-white outline-none focus:border-sky-400/50"
                        placeholder="State"
                      />
                    </div>
                    <textarea
                      value={enrichmentDraft.reviewNotes}
                      onChange={(event) => setEnrichmentDraft({ ...enrichmentDraft, reviewNotes: event.target.value })}
                      rows={3}
                      className="admin-scroll rounded-lg border border-white/10 bg-black px-3 py-2 text-sm text-white outline-none focus:border-sky-400/50"
                      placeholder="Internal review notes"
                    />
                    <button
                      type="button"
                      onClick={() => saveEnrichment(selectedResult)}
                      disabled={updatingResultId === selectedResult._id || !enrichmentDraft.name.trim()}
                      className="min-h-10 rounded-xl border border-sky-300/25 bg-sky-400/10 px-4 py-2 text-sm font-semibold text-sky-200 transition-colors hover:border-sky-300/45 hover:bg-sky-400/15 disabled:opacity-50"
                    >
                      {updatingResultId === selectedResult._id ? "Saving..." : "Save enrichment"}
                    </button>
                  </div>
                </div>

                <div className="rounded-xl border border-sky-300/15 bg-sky-400/[0.06] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.16em] text-sky-200/70">Outreach draft</p>
                      <p className="mt-1 text-xs text-white/35">
                        {selectedResult.outreachSentAt
                          ? `Sent ${fmtDate(selectedResult.outreachSentAt)}`
                          : selectedResult.outreachGeneratedAt
                            ? `Generated ${fmtDate(selectedResult.outreachGeneratedAt)}`
                            : "Generate a first-pass email from the lead profile."}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => generateOutreach(selectedResult)}
                      disabled={outreachActionId === selectedResult._id || selectedResult.dismissed || selectedResult.doNotContact}
                      className="rounded-xl border border-sky-300/25 px-3 py-2 text-xs font-semibold text-sky-200 transition-colors hover:border-sky-300/45 disabled:opacity-50"
                    >
                      {outreachActionId === selectedResult._id ? "Working..." : outreachDraft.subject ? "Regenerate" : "Generate"}
                    </button>
                  </div>
                  <div className="mt-3 space-y-2">
                    <input
                      value={outreachDraft.subject}
                      onChange={(event) => setOutreachDraft({ ...outreachDraft, subject: event.target.value })}
                      className="min-h-10 w-full rounded-lg border border-white/10 bg-black px-3 text-sm text-white outline-none focus:border-sky-400/50"
                      placeholder="Outreach subject"
                    />
                    <textarea
                      value={outreachDraft.bodyHtml}
                      onChange={(event) => setOutreachDraft({ ...outreachDraft, bodyHtml: event.target.value })}
                      rows={8}
                      className="admin-scroll w-full rounded-lg border border-white/10 bg-black px-3 py-2 text-sm text-white outline-none focus:border-sky-400/50"
                      placeholder="Outreach email HTML"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => saveOutreachDraft(selectedResult)}
                        disabled={updatingResultId === selectedResult._id || !outreachDraft.subject.trim() || !outreachDraft.bodyHtml.trim()}
                        className="rounded-xl border border-white/10 px-3 py-2 text-sm text-white/65 transition-colors hover:border-white/20 hover:text-white disabled:opacity-50"
                      >
                        Save draft
                      </button>
                      <button
                        type="button"
                        onClick={() => sendOutreach(selectedResult)}
                        disabled={
                          outreachActionId === selectedResult._id ||
                          selectedResult.dismissed ||
                          selectedResult.doNotContact ||
                          !selectedResult.business.email ||
                          !outreachDraft.subject.trim() ||
                          !outreachDraft.bodyHtml.trim()
                        }
                        className="rounded-xl bg-sky-400 px-3 py-2 text-sm font-semibold text-black transition-colors hover:bg-sky-300 disabled:opacity-50"
                      >
                        {outreachActionId === selectedResult._id ? "Sending..." : "Send"}
                      </button>
                    </div>
                    {!selectedResult.business.email && (
                      <p className="text-xs text-amber-200/75">Add a verified public email before sending outreach.</p>
                    )}
                  </div>
                </div>

                <div className="rounded-xl border border-white/8 bg-black/25 p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-white/30">Source evidence</p>
                  <div className="mt-3 space-y-3">
                    {selectedResult.sources.map((source) => (
                      <div key={`${source.providerKey}-${source.providerRecordId}`} className="text-sm">
                        <p className="font-medium text-white">{source.providerKey}</p>
                        <p className="mt-0.5 text-xs text-white/35">{source.attribution}</p>
                        {source.sourceUrl && (
                          <a href={source.sourceUrl} target="_blank" rel="noreferrer" className="mt-1 block text-xs text-sky-300 hover:text-sky-200">
                            View source
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {selectedResult.convertedPipelineContactId ? (
                  <Link href={`/admin/pipeline/contacts/${selectedResult.convertedPipelineContactId}`} className="block rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-center text-sm font-semibold text-emerald-300 hover:border-emerald-300/40">
                    Open pipeline contact
                  </Link>
                ) : (
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => convertToCrm(selectedResult)}
                      disabled={convertingId === selectedResult._id || selectedResult.dismissed || selectedResult.doNotContact}
                      className="w-full rounded-xl bg-sky-400 px-4 py-3 text-sm font-semibold text-black transition-colors hover:bg-sky-300 disabled:opacity-50"
                    >
                      {convertingId === selectedResult._id ? "Converting..." : "Convert to pipeline"}
                    </button>
                    <button
                      type="button"
                      onClick={() => patchResult(selectedResult, { reviewed: !selectedResult.reviewedAt }, selectedResult.reviewedAt ? "Lead moved back to review." : "Lead marked reviewed.")}
                      disabled={updatingResultId === selectedResult._id}
                      className="w-full rounded-xl border border-white/10 px-4 py-2 text-sm font-medium text-white/65 transition-colors hover:border-white/20 hover:text-white disabled:opacity-50"
                    >
                      {selectedResult.reviewedAt ? "Move back to review" : "Mark reviewed"}
                    </button>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => patchResult(selectedResult, { dismissed: !selectedResult.dismissed, reviewed: true }, selectedResult.dismissed ? "Lead restored." : "Lead dismissed.")}
                        disabled={updatingResultId === selectedResult._id}
                        className="rounded-xl border border-white/10 px-3 py-2 text-sm text-white/55 transition-colors hover:border-white/20 hover:text-white disabled:opacity-50"
                      >
                        {selectedResult.dismissed ? "Restore" : "Dismiss"}
                      </button>
                      <button
                        type="button"
                        onClick={() => patchResult(selectedResult, { doNotContact: !selectedResult.doNotContact, reviewed: true }, selectedResult.doNotContact ? "Lead contact hold removed." : "Lead marked do not contact.")}
                        disabled={updatingResultId === selectedResult._id}
                        className="rounded-xl border border-red-300/15 px-3 py-2 text-sm text-red-200/75 transition-colors hover:border-red-300/30 hover:text-red-100 disabled:opacity-50"
                      >
                        {selectedResult.doNotContact ? "Allow contact" : "DNC"}
                      </button>
                    </div>
                  </div>
                )}
              </aside>
            </div>
          )}
        </div>

        <aside className="space-y-5">
          <div id="lead-lists" className="rounded-2xl border border-white/10 bg-[#101010] p-5">
            <h2 className="text-lg font-semibold text-white">Lead Lists</h2>
            <div className="mt-4 space-y-3">
              {[
                { label: "Ready for review", value: resultLists.readyForReview.length },
                { label: "Reviewed", value: resultLists.reviewed.length },
                { label: "High opportunity", value: resultLists.highOpportunity.length },
                { label: "Needs website", value: resultLists.needsWebsite.length },
                { label: "Needs contact enrichment", value: resultLists.needsContact.length },
                { label: "Dismissed", value: resultLists.dismissed.length },
                { label: "Do not contact", value: resultLists.doNotContact.length },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between rounded-xl border border-white/8 bg-black/25 px-3 py-2">
                  <span className="text-sm text-white/55">{item.label}</span>
                  <span className="text-sm font-semibold text-white">{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          {possibleMatches && (
            <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 p-5">
              <h2 className="text-sm font-semibold text-amber-100">Possible CRM Match</h2>
              <div className="mt-3 space-y-2">
                {possibleMatches.matches.map((match) => (
                  <Link key={match._id} href={`/admin/pipeline/contacts/${match._id}`} className="block rounded-xl border border-amber-300/15 bg-black/25 p-3 text-sm text-amber-50 hover:border-amber-300/35">
                    <span className="block font-medium">{match.company || match.name}</span>
                    <span className="mt-1 block text-xs text-amber-100/55">{match.email || match.phone || match.siteUrl || match.stage}</span>
                  </Link>
                ))}
              </div>
              <button
                type="button"
                onClick={() => convertToCrm(possibleMatches.result, true)}
                disabled={convertingId === possibleMatches.result._id}
                className="mt-4 w-full rounded-xl bg-amber-300 px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-amber-200 disabled:opacity-50"
              >
                Force new pipeline contact
              </button>
            </div>
          )}
        </aside>
      </section>

      <section id="website-audits" className="grid gap-5 lg:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-[#101010] p-5">
          <h2 className="text-lg font-semibold text-white">Website Audits</h2>
          <p className="mt-2 text-sm leading-relaxed text-white/40">
            Phase 2 starts with source-level website presence checks. Deeper technology, accessibility, and performance audits can layer on top of these profiles.
          </p>
          <p className="mt-4 text-3xl font-semibold text-white">{resultLists.needsWebsite.length}</p>
          <p className="text-xs uppercase tracking-[0.16em] text-white/30">without source website</p>
        </div>
        <div id="enrichment-queue" className="rounded-2xl border border-white/10 bg-[#101010] p-5">
          <h2 className="text-lg font-semibold text-white">Enrichment Queue</h2>
          <p className="mt-2 text-sm leading-relaxed text-white/40">
            Results missing email, phone, or website are now grouped for manual enrichment before outreach.
          </p>
          <p className="mt-4 text-3xl font-semibold text-white">{resultLists.needsContact.length}</p>
          <p className="text-xs uppercase tracking-[0.16em] text-white/30">need contact enrichment</p>
        </div>
        <div id="outreach-studio" className="rounded-2xl border border-white/10 bg-[#101010] p-5">
          <h2 className="text-lg font-semibold text-white">Outreach Studio</h2>
          <p className="mt-2 text-sm leading-relaxed text-white/40">
            Convert qualified results into the pipeline first, then use the existing email and pipeline tools for follow-up.
          </p>
          <Link href="/admin/email/compose" className="mt-4 inline-flex rounded-xl border border-white/10 px-4 py-2 text-sm text-white/65 hover:border-white/20 hover:text-white">
            Open composer
          </Link>
        </div>
      </section>

      <section id="search-history" className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="rounded-2xl border border-white/10 bg-[#101010] p-5">
          <h2 className="text-lg font-semibold text-white">Search History</h2>
          <div className="mt-4 space-y-3">
            {searches.length ? searches.map((search) => (
              <div key={search._id} className="rounded-xl border border-white/8 bg-black/25 p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium text-white">{search.name}</p>
                    <p className="mt-1 text-xs text-white/35">{fmtDate(search.lastRunAt)} · {search.lastRunMessage || "Draft search"}</p>
                  </div>
                  <span className={`w-fit rounded-full px-2.5 py-1 text-xs ${statusClass(search.status)}`}>{search.status}</span>
                </div>
              </div>
            )) : (
              <p className="rounded-xl border border-dashed border-white/10 p-6 text-sm text-white/35">No Lead Intelligence searches yet.</p>
            )}
          </div>
        </div>

        <div id="usage-and-costs" className="rounded-2xl border border-white/10 bg-[#101010] p-5">
          <h2 className="text-lg font-semibold text-white">Usage and Costs</h2>
          <div className="mt-4 space-y-3">
            <div className="rounded-xl border border-white/8 bg-black/25 p-3">
              <p className="text-xs uppercase tracking-[0.16em] text-white/30">30 day provider requests</p>
              <p className="mt-1 text-2xl font-semibold text-white">{usage.requests.toLocaleString()}</p>
            </div>
            <div className="rounded-xl border border-white/8 bg-black/25 p-3">
              <p className="text-xs uppercase tracking-[0.16em] text-white/30">Actual cost</p>
              <p className="mt-1 text-2xl font-semibold text-emerald-300">${usage.costUsd.toFixed(2)}</p>
            </div>
            <div className="rounded-xl border border-white/8 bg-black/25 p-3">
              <p className="text-xs uppercase tracking-[0.16em] text-white/30">Estimated Google cost avoided</p>
              <p className="mt-1 text-2xl font-semibold text-sky-200">${usage.avoidedGoogleCostUsd.toFixed(2)}</p>
            </div>
          </div>
        </div>
      </section>

      <section id="settings" className="rounded-2xl border border-white/10 bg-[#101010] p-5">
        <h2 className="text-lg font-semibold text-white">Settings</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-white/8 bg-black/25 p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-white/30">Default cost mode</p>
            <p className="mt-1 text-sm font-semibold text-emerald-300">Free Only</p>
          </div>
          <div className="rounded-xl border border-white/8 bg-black/25 p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-white/30">Cache window</p>
            <p className="mt-1 text-sm font-semibold text-white">Recent equivalent searches</p>
          </div>
          <div className="rounded-xl border border-white/8 bg-black/25 p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-white/30">Policy status</p>
            <p className="mt-1 text-sm font-semibold text-amber-200">Attribution review visible</p>
          </div>
        </div>
      </section>
    </div>
  );
}

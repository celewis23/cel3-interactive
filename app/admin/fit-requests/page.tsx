"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type FitStatus = "new" | "contacted" | "qualified" | "not_fit" | "archived";

type FitRequest = {
  _id: string;
  _createdAt?: string;
  name?: string | null;
  leadEmail?: string | null;
  company?: string | null;
  website?: string | null;
  budget?: string | null;
  timeline?: string | null;
  services?: string[] | null;
  message?: string | null;
  source?: string | null;
  status: FitStatus;
  createdAt?: string | null;
  threadKey?: string | null;
  emailMeta?: {
    threadKey?: string;
    teamEmailSent?: boolean;
    leadAckSent?: boolean;
    teamSentAt?: string;
    leadAckSentAt?: string;
  } | null;
  adminNotes?: string | null;
  contactedAt?: string | null;
  pipelineContactId?: string | null;
};

const STATUS_OPTIONS: Array<{ value: FitStatus | "all"; label: string }> = [
  { value: "all", label: "All" },
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "qualified", label: "Qualified" },
  { value: "not_fit", label: "Not Fit" },
  { value: "archived", label: "Archived" },
];

const STATUS_STYLES: Record<FitStatus, string> = {
  new: "bg-sky-500/15 text-sky-300",
  contacted: "bg-amber-500/15 text-amber-300",
  qualified: "bg-emerald-500/15 text-emerald-300",
  not_fit: "bg-red-500/15 text-red-300",
  archived: "bg-white/10 text-white/45",
};

function statusLabel(status: string) {
  return status.replaceAll("_", " ");
}

function formatDate(value?: string | null) {
  if (!value) return "";
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function normalizeWebsite(value?: string | null) {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function buildLeadNotes(request: FitRequest) {
  const services = request.services?.length ? request.services.join(", ") : "None selected";
  return [
    "Created from Fit request.",
    "",
    `Budget: ${request.budget || "Not provided"}`,
    `Timeline: ${request.timeline || "Not provided"}`,
    `Services: ${services}`,
    request.website ? `Website: ${request.website}` : "",
    request.threadKey ? `Thread: ${request.threadKey}` : "",
    "",
    "Message:",
    request.message || "",
  ].filter((line) => line !== "").join("\n");
}

export default function FitRequestsPage() {
  const [requests, setRequests] = useState<FitRequest[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<FitStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      params.set("status", statusFilter);
      if (search.trim()) params.set("q", search.trim());
      const res = await fetch(`/api/admin/fit-requests?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load fit requests");
      const list: FitRequest[] = data.requests ?? [];
      setRequests(list);

      const urlSelectedId = new URL(window.location.href).searchParams.get("id");
      if (urlSelectedId && list.some((r) => r._id === urlSelectedId)) {
        setSelectedId(urlSelectedId);
      } else if (!selectedId || !list.some((r) => r._id === selectedId)) {
        setSelectedId(list[0]?._id ?? null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load fit requests");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 250);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  function selectRequest(id: string) {
    setSelectedId(id);
    const url = new URL(window.location.href);
    url.searchParams.set("id", id);
    window.history.replaceState(null, "", url.toString());
  }

  function updateRequest(updated: FitRequest) {
    setRequests((prev) => prev.map((request) => request._id === updated._id ? updated : request));
  }

  const selected = useMemo(
    () => requests.find((request) => request._id === selectedId) ?? null,
    [requests, selectedId]
  );

  return (
    <div className="flex h-full min-h-[650px] gap-0 -m-8 overflow-hidden" style={{ height: "calc(100dvh - 4rem)" }}>
      <aside className="flex w-80 shrink-0 flex-col border-r border-white/8 bg-black/10">
        <div className="border-b border-white/8 px-4 py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-base font-semibold text-white">Fit Requests</h1>
              <p className="mt-0.5 text-xs text-white/35">{requests.length} shown</p>
            </div>
            <Link href="/admin" className="text-xs text-white/35 hover:text-sky-300">
              Dashboard
            </Link>
          </div>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search requests..."
            className="mt-3 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/25 outline-none transition-colors focus:border-sky-500/50"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as FitStatus | "all")}
            className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none [color-scheme:dark] focus:border-sky-500/50"
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>

        {error && (
          <div className="mx-3 mt-3 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-400">
            {error}
          </div>
        )}

        <div className="flex-1 overflow-y-auto py-2">
          {loading ? (
            <div className="px-4 py-6 text-xs text-white/35">Loading...</div>
          ) : requests.length === 0 ? (
            <div className="px-4 py-8 text-center text-xs text-white/30">No Fit requests found.</div>
          ) : (
            requests.map((request) => {
              const created = request.createdAt ?? request._createdAt;
              const services = request.services ?? [];
              return (
                <button
                  key={request._id}
                  type="button"
                  onClick={() => selectRequest(request._id)}
                  className={`w-full border-l-2 px-4 py-3 text-left transition-colors ${
                    selectedId === request._id
                      ? "border-sky-400 bg-white/6"
                      : "border-transparent hover:bg-white/3"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-white/90">{request.name || "Unnamed request"}</p>
                      <p className="mt-0.5 truncate text-xs text-white/35">{request.company || request.leadEmail || "No company"}</p>
                    </div>
                    <span className="shrink-0 text-[10px] text-white/25">{formatDate(created)}</span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] capitalize ${STATUS_STYLES[request.status] ?? STATUS_STYLES.new}`}>
                      {statusLabel(request.status)}
                    </span>
                    {request.budget && (
                      <span className="rounded-full bg-white/8 px-2 py-0.5 text-[10px] text-white/45">{request.budget}</span>
                    )}
                    {services.slice(0, 2).map((service) => (
                      <span key={service} className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-white/35">{service}</span>
                    ))}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {selected ? (
          <FitRequestDetail request={selected} onUpdate={updateRequest} />
        ) : (
          <div className="flex flex-1 items-center justify-center text-sm text-white/30">
            Select a Fit request to view details.
          </div>
        )}
      </main>
    </div>
  );
}

function FitRequestDetail({
  request,
  onUpdate,
}: {
  request: FitRequest;
  onUpdate: (request: FitRequest) => void;
}) {
  const [status, setStatus] = useState<FitStatus>(request.status);
  const [adminNotes, setAdminNotes] = useState(request.adminNotes ?? "");
  const [savingStatus, setSavingStatus] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);
  const [creatingLead, setCreatingLead] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setStatus(request.status);
    setAdminNotes(request.adminNotes ?? "");
    setError("");
  }, [request]);

  const email = request.leadEmail?.trim() || "";
  const created = request.createdAt ?? request._createdAt;
  const website = normalizeWebsite(request.website);

  async function patchRequest(payload: Record<string, unknown>) {
    const res = await fetch(`/api/admin/fit-requests/${request._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to update Fit request");
    onUpdate(data);
    return data as FitRequest;
  }

  async function saveStatus() {
    if (status === request.status) return;
    setSavingStatus(true);
    setError("");
    try {
      await patchRequest({ status });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save status");
    } finally {
      setSavingStatus(false);
    }
  }

  async function saveNotes() {
    setSavingNotes(true);
    setError("");
    try {
      await patchRequest({ adminNotes: adminNotes.trim() || null });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save notes");
    } finally {
      setSavingNotes(false);
    }
  }

  async function createPipelineLead() {
    if (request.pipelineContactId || creatingLead) return;
    setCreatingLead(true);
    setError("");
    try {
      const res = await fetch("/api/admin/pipeline/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: request.name?.trim() || request.company?.trim() || "Fit Request",
          email: email || null,
          company: request.company?.trim() || null,
          source: "Website",
          notes: buildLeadNotes(request),
          stage: "new-lead",
          siteUrl: request.website?.trim() || null,
        }),
      });
      const contact = await res.json();
      if (!res.ok) throw new Error(contact.error || "Failed to create pipeline lead");
      await patchRequest({ pipelineContactId: contact._id, status: "qualified" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create pipeline lead");
    } finally {
      setCreatingLead(false);
    }
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <header className="shrink-0 border-b border-white/8 px-6 py-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.22em] text-white/35">Fit Request</p>
            <h2 className="mt-1 text-2xl font-semibold text-white">{request.name || "Unnamed request"}</h2>
            <p className="mt-1 text-sm text-white/40">
              {[request.company, email, formatDate(created)].filter(Boolean).join(" · ")}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {email ? (
              <Link
                href={`/admin/email/compose?to=${encodeURIComponent(email)}`}
                className="rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-sky-400"
              >
                Email Person
              </Link>
            ) : (
              <span className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/35">
                Email unavailable
              </span>
            )}
            {request.pipelineContactId ? (
              <Link
                href={`/admin/pipeline/contacts/${request.pipelineContactId}`}
                className="rounded-xl bg-white/8 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/12"
              >
                Open Pipeline Lead
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => void createPipelineLead()}
                disabled={creatingLead}
                className="rounded-xl bg-white/8 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/12 disabled:opacity-40"
              >
                {creatingLead ? "Creating..." : "Create Pipeline Lead"}
              </button>
            )}
          </div>
        </div>
        {error && <p className="mt-3 text-xs text-red-400">{error}</p>}
      </header>

      <div className="flex flex-1 overflow-hidden">
        <section className="flex-1 overflow-y-auto px-6 py-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Info label="Budget" value={request.budget} />
            <Info label="Timeline" value={request.timeline} />
            <Info label="Source" value={request.source} />
            <Info label="Thread" value={request.threadKey ?? request.emailMeta?.threadKey} />
          </div>

          {website && (
            <div className="mt-4">
              <p className="mb-1 text-xs text-white/30">Website</p>
              <a href={website} target="_blank" rel="noopener noreferrer" className="break-all text-sm text-sky-300 hover:text-sky-200">
                {website}
              </a>
            </div>
          )}

          {request.services?.length ? (
            <div className="mt-5">
              <p className="mb-2 text-xs text-white/30">Services</p>
              <div className="flex flex-wrap gap-2">
                {request.services.map((service) => (
                  <span key={service} className="rounded-full bg-white/7 px-3 py-1 text-xs text-white/55">{service}</span>
                ))}
              </div>
            </div>
          ) : null}

          <div className="mt-6">
            <p className="mb-2 text-xs text-white/30">Project Details</p>
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
              <p className="whitespace-pre-wrap text-sm leading-6 text-white/72">{request.message || "No message provided."}</p>
            </div>
          </div>

          {!email && (
            <div className="mt-5 rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4 text-sm text-amber-100/80">
              This older Fit request does not have a preserved requester email in the admin record. Future requests now save the contact email separately.
            </div>
          )}

          <div className="mt-6 space-y-4 lg:hidden">
            <div>
              <label className="mb-1.5 block text-xs text-white/35">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as FitStatus)}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none [color-scheme:dark] focus:border-sky-500/50"
              >
                {STATUS_OPTIONS.filter((option) => option.value !== "all").map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => void saveStatus()}
                disabled={savingStatus || status === request.status}
                className="mt-2 w-full rounded-xl bg-sky-500 px-3 py-2 text-sm font-semibold text-black transition-colors hover:bg-sky-400 disabled:opacity-40"
              >
                {savingStatus ? "Saving..." : "Save Status"}
              </button>
            </div>

            <div>
              <label className="mb-1.5 block text-xs text-white/35">Internal Notes</label>
              <textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                rows={6}
                placeholder="Add follow-up notes, qualification details, or context..."
                className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/25 outline-none focus:border-sky-500/50"
              />
              <button
                type="button"
                onClick={() => void saveNotes()}
                disabled={savingNotes || adminNotes === (request.adminNotes ?? "")}
                className="mt-2 w-full rounded-xl bg-white/8 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-white/12 disabled:opacity-40"
              >
                {savingNotes ? "Saving..." : "Save Notes"}
              </button>
            </div>
          </div>
        </section>

        <aside className="hidden w-80 shrink-0 overflow-y-auto border-l border-white/8 px-5 py-5 lg:block">
          <div>
            <label className="mb-1.5 block text-xs text-white/35">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as FitStatus)}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none [color-scheme:dark] focus:border-sky-500/50"
            >
              {STATUS_OPTIONS.filter((option) => option.value !== "all").map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => void saveStatus()}
              disabled={savingStatus || status === request.status}
              className="mt-2 w-full rounded-xl bg-sky-500 px-3 py-2 text-sm font-semibold text-black transition-colors hover:bg-sky-400 disabled:opacity-40"
            >
              {savingStatus ? "Saving..." : "Save Status"}
            </button>
          </div>

          <div className="mt-6">
            <label className="mb-1.5 block text-xs text-white/35">Internal Notes</label>
            <textarea
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              rows={8}
              placeholder="Add follow-up notes, qualification details, or context..."
              className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/25 outline-none focus:border-sky-500/50"
            />
            <button
              type="button"
              onClick={() => void saveNotes()}
              disabled={savingNotes || adminNotes === (request.adminNotes ?? "")}
              className="mt-2 w-full rounded-xl bg-white/8 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-white/12 disabled:opacity-40"
            >
              {savingNotes ? "Saving..." : "Save Notes"}
            </button>
          </div>

          <div className="mt-6 space-y-2 rounded-2xl border border-white/8 bg-white/[0.03] p-4 text-xs text-white/40">
            <p>ID: <span className="text-white/55">{request._id}</span></p>
            {request.contactedAt && <p>Contacted: {formatDate(request.contactedAt)}</p>}
            {request.emailMeta?.teamEmailSent && <p>Team email sent</p>}
            {request.emailMeta?.leadAckSent && <p>Lead acknowledgement sent</p>}
          </div>
        </aside>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
      <p className="text-xs text-white/30">{label}</p>
      <p className="mt-1 text-sm font-medium text-white/75">{value || "Not provided"}</p>
    </div>
  );
}

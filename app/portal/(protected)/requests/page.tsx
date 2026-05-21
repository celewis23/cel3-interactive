"use client";

import { useEffect, useRef, useState } from "react";

type PortalProject = { _id: string; name: string; status: string };
type TicketNote = { _key: string; text: string; createdAt: string };
type TicketAttachment = { _key?: string; name: string; webViewLink?: string | null };
type PortalTicket = {
  _id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  projectId: string | null;
  projectName: string | null;
  createdAt: string;
  updatedAt: string;
  adminNotes: string | null;
  ticketNotes?: TicketNote[];
  attachments?: TicketAttachment[];
};

const STATUS_STYLES: Record<string, string> = {
  submitted: "bg-sky-500/15 text-sky-300",
  in_progress: "bg-amber-500/15 text-amber-300",
  waiting_on_client: "bg-violet-500/15 text-violet-300",
  completed: "bg-emerald-500/15 text-emerald-300",
  closed: "bg-white/10 text-white/50",
};

const PRIORITY_DOT: Record<string, string> = {
  urgent: "bg-red-400",
  high: "bg-orange-400",
  medium: "bg-amber-400",
  low: "bg-white/30",
};

type RightPanel = "new" | "detail";

export default function PortalRequestsPage() {
  const [tickets, setTickets] = useState<PortalTicket[]>([]);
  const [projects, setProjects] = useState<PortalProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [panel, setPanel] = useState<RightPanel>("new");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    projectId: "",
    priority: "medium",
  });

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/portal/tickets");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load requests");
      setTickets(data.tickets ?? []);
      setProjects(data.projects ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load requests");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !form.description.trim()) return;
    setSaving(true);
    setError("");
    try {
      const body = new FormData();
      body.append("title", form.title.trim());
      body.append("description", form.description.trim());
      body.append("priority", form.priority);
      if (form.projectId) body.append("projectId", form.projectId);
      for (const file of Array.from(fileRef.current?.files ?? [])) {
        body.append("files", file);
      }

      const res = await fetch("/api/portal/tickets", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit request");

      const newTicket: PortalTicket = data;
      setTickets((prev) => [newTicket, ...prev]);
      setForm({ title: "", description: "", projectId: "", priority: "medium" });
      if (fileRef.current) fileRef.current.value = "";
      setSelectedId(newTicket._id);
      setPanel("detail");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit request");
    } finally {
      setSaving(false);
    }
  }

  function selectTicket(id: string) {
    setSelectedId(id);
    setPanel("detail");
  }

  const selectedTicket = tickets.find((t) => t._id === selectedId) ?? null;

  return (
    <div className="flex gap-0 -m-8 overflow-hidden" style={{ height: "calc(100dvh - 4rem)" }}>
      {/* Left: request list */}
      <div className="flex w-64 shrink-0 flex-col border-r border-white/8 bg-white/[0.015]">
        <div className="shrink-0 border-b border-white/8 px-4 py-4">
          <h1 className="text-sm font-semibold text-white">Your Requests</h1>
          <p className="mt-0.5 text-xs text-white/35">{tickets.length} request{tickets.length !== 1 ? "s" : ""}</p>
        </div>

        {/* New Request button */}
        <div className="shrink-0 px-3 py-2.5 border-b border-white/8">
          <button
            type="button"
            onClick={() => { setPanel("new"); setSelectedId(null); }}
            className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
              panel === "new"
                ? "bg-sky-500/15 text-sky-300"
                : "text-white/55 hover:bg-white/5 hover:text-white"
            }`}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 1.5V12.5M1.5 7H12.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            New Request
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-1.5">
          {loading ? (
            <div className="px-4 py-6 text-xs text-white/30">Loading…</div>
          ) : tickets.length === 0 ? (
            <div className="px-4 py-6 text-center text-xs text-white/25">No requests yet.</div>
          ) : (
            tickets.map((ticket) => (
              <button
                key={ticket._id}
                type="button"
                onClick={() => selectTicket(ticket._id)}
                className={`w-full px-3 py-2.5 text-left transition-colors border-l-2 ${
                  selectedId === ticket._id && panel === "detail"
                    ? "bg-white/6 border-sky-400"
                    : "border-transparent hover:bg-white/3"
                }`}
              >
                <div className="flex items-start gap-2">
                  <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${PRIORITY_DOT[ticket.priority] ?? "bg-white/30"}`} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-white/85">{ticket.title}</p>
                    <div className="mt-1 flex items-center gap-1.5">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${STATUS_STYLES[ticket.status] ?? "bg-white/10 text-white/50"}`}>
                        {ticket.status.replaceAll("_", " ")}
                      </span>
                      <span className="text-[10px] text-white/25">
                        {new Date(ticket.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Right: new request form or detail view */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {panel === "new" ? (
          <NewRequestPanel
            form={form}
            setForm={setForm}
            projects={projects}
            fileRef={fileRef}
            saving={saving}
            error={error}
            onSubmit={handleSubmit}
          />
        ) : selectedTicket ? (
          <TicketDetailPanel ticket={selectedTicket} onNewRequest={() => setPanel("new")} />
        ) : (
          <div className="flex flex-1 items-center justify-center text-sm text-white/30">
            Select a request or create a new one.
          </div>
        )}
      </div>
    </div>
  );
}

function NewRequestPanel({
  form,
  setForm,
  projects,
  fileRef,
  saving,
  error,
  onSubmit,
}: {
  form: { title: string; description: string; projectId: string; priority: string };
  setForm: React.Dispatch<React.SetStateAction<{ title: string; description: string; projectId: string; priority: string }>>;
  projects: PortalProject[];
  fileRef: React.RefObject<HTMLInputElement | null>;
  saving: boolean;
  error: string;
  onSubmit: (e: React.FormEvent) => void;
}) {
  return (
    <div className="flex-1 overflow-y-auto px-8 py-8">
      <div className="max-w-2xl">
        <h2 className="text-xl font-semibold text-white mb-1">New Request</h2>
        <p className="text-sm text-white/40 mb-6">Submit updates, fixes, content changes, product additions, or anything you need us to handle.</p>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="text-xs text-white/50 mb-1.5 block">Request title</label>
            <input
              value={form.title}
              onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
              placeholder="Homepage update, product upload, bug fix…"
              className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-white/20 outline-none focus:border-sky-500/50 transition-colors"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs text-white/50 mb-1.5 block">Project</label>
              <select
                value={form.projectId}
                onChange={(e) => setForm((prev) => ({ ...prev, projectId: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-sky-500/50 [color-scheme:dark]"
              >
                <option value="">General request</option>
                {projects.map((project) => (
                  <option key={project._id} value={project._id}>{project.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-white/50 mb-1.5 block">Priority</label>
              <select
                value={form.priority}
                onChange={(e) => setForm((prev) => ({ ...prev, priority: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-sky-500/50 [color-scheme:dark]"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs text-white/50 mb-1.5 block">What needs to be done?</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              rows={7}
              placeholder="Share the exact update, where it should happen, any deadlines, and anything we should know."
              className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-white/20 outline-none focus:border-sky-500/50 transition-colors resize-none"
            />
          </div>
          <div>
            <label className="text-xs text-white/50 mb-1.5 block">Upload assets</label>
            <input
              ref={fileRef}
              type="file"
              multiple
              className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-sky-500 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-black"
            />
            <p className="text-xs text-white/30 mt-2">Files are stored in your dedicated Google Drive portal folder.</p>
          </div>
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl p-3">{error}</div>
          )}
          <button
            type="submit"
            disabled={saving || !form.title.trim() || !form.description.trim()}
            className="px-6 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 disabled:opacity-40 text-black font-semibold text-sm transition-colors"
          >
            {saving ? "Submitting…" : "Submit request"}
          </button>
        </form>
      </div>
    </div>
  );
}

function TicketDetailPanel({
  ticket,
  onNewRequest,
}: {
  ticket: PortalTicket;
  onNewRequest: () => void;
}) {
  const notes: TicketNote[] = ticket.ticketNotes ?? [];
  const legacyNote = ticket.adminNotes && notes.length === 0 ? ticket.adminNotes : null;
  const hasNotes = notes.length > 0 || !!legacyNote;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <div className="shrink-0 border-b border-white/8 px-8 py-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_STYLES[ticket.status] ?? "bg-white/10 text-white/50"}`}>
                {ticket.status.replaceAll("_", " ")}
              </span>
              <span className="text-xs text-white/30 capitalize">{ticket.priority} priority</span>
            </div>
            <h2 className="text-xl font-semibold text-white">{ticket.title}</h2>
            <p className="mt-1 text-xs text-white/35">
              {ticket.projectName ? `${ticket.projectName} · ` : ""}
              Submitted {new Date(ticket.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
            </p>
          </div>
          <button
            type="button"
            onClick={onNewRequest}
            className="shrink-0 rounded-xl bg-sky-500/15 px-3 py-1.5 text-sm font-medium text-sky-300 hover:bg-sky-500/25 transition-colors"
          >
            + New Request
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Description + attachments */}
        <div className="flex-1 overflow-y-auto px-8 py-6">
          <p className="text-sm font-medium text-white/50 uppercase tracking-wider mb-3 text-[11px]">Description</p>
          <p className="text-sm text-white/70 whitespace-pre-wrap leading-relaxed">{ticket.description}</p>

          {ticket.attachments?.length ? (
            <div className="mt-6">
              <p className="text-[11px] font-medium text-white/50 uppercase tracking-wider mb-2">Attachments</p>
              <div className="flex flex-wrap gap-2">
                {ticket.attachments.map((a) => (
                  <a
                    key={a._key ?? a.name}
                    href={a.webViewLink ?? "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-sky-300 hover:bg-white/8 transition-colors"
                  >
                    {a.name}
                  </a>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        {/* Team notes */}
        <div className="flex w-72 shrink-0 flex-col border-l border-white/8">
          <div className="shrink-0 border-b border-white/8 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-white/40">Team Notes</p>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            {!hasNotes ? (
              <p className="text-xs text-white/25 text-center py-4">No team notes yet.</p>
            ) : (
              <>
                {legacyNote && (
                  <div className="rounded-xl border border-white/8 bg-white/3 p-3">
                    <p className="text-sm text-white/65 whitespace-pre-wrap">{legacyNote}</p>
                  </div>
                )}
                {[...notes].reverse().map((note) => (
                  <div key={note._key} className="rounded-xl border border-white/8 bg-white/3 p-3">
                    <p className="text-[10px] text-white/30 mb-1.5">
                      {new Date(note.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </p>
                    <p className="text-sm text-white/70 whitespace-pre-wrap leading-relaxed">{note.text}</p>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

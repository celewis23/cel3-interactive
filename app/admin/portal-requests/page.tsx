"use client";

import { useEffect, useState } from "react";

type TicketNote = { _key: string; text: string; createdAt: string };
type TicketAttachment = { _key?: string; name: string; webViewLink?: string | null };
type AdminPortalTicket = {
  _id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  projectName: string | null;
  clientEmail: string | null;
  createdAt: string;
  updatedAt: string;
  adminNotes: string | null;
  ticketNotes?: TicketNote[];
  attachments?: TicketAttachment[];
};

const STATUS_OPTIONS = [
  { value: "submitted", label: "Submitted" },
  { value: "in_progress", label: "In Progress" },
  { value: "waiting_on_client", label: "Waiting on Client" },
  { value: "completed", label: "Completed" },
  { value: "closed", label: "Closed" },
];

const STATUS_STYLES: Record<string, string> = {
  submitted: "bg-sky-500/15 text-sky-300",
  in_progress: "bg-amber-500/15 text-amber-300",
  waiting_on_client: "bg-violet-500/15 text-violet-300",
  completed: "bg-emerald-500/15 text-emerald-300",
  closed: "bg-white/10 text-white/45",
};

const PRIORITY_DOT: Record<string, string> = {
  urgent: "bg-red-400",
  high: "bg-orange-400",
  medium: "bg-amber-400",
  low: "bg-white/30",
};

export default function AdminPortalRequestsPage() {
  const [tickets, setTickets] = useState<AdminPortalTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/portal-requests");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load requests");
      const list: AdminPortalTicket[] = data.tickets ?? [];
      setTickets(list);
      if (list.length > 0 && !selectedId) setSelectedId(list[0]._id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load requests");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  function handleTicketUpdate(updated: AdminPortalTicket) {
    setTickets((prev) => prev.map((t) => (t._id === updated._id ? updated : t)));
  }

  const selected = tickets.find((t) => t._id === selectedId) ?? null;

  return (
    <div className="flex h-full min-h-[600px] gap-0 -m-8 overflow-hidden" style={{ height: "calc(100dvh - 4rem)" }}>
      {/* Left list */}
      <div className="flex w-72 shrink-0 flex-col border-r border-white/8">
        <div className="border-b border-white/8 px-4 py-4">
          <h1 className="text-base font-semibold text-white">Client Requests</h1>
          <p className="mt-0.5 text-xs text-white/35">{tickets.length} total</p>
        </div>

        {error && (
          <div className="mx-3 mt-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-3">{error}</div>
        )}

        <div className="flex-1 overflow-y-auto py-2">
          {loading ? (
            <div className="px-4 py-6 text-xs text-white/35">Loading…</div>
          ) : tickets.length === 0 ? (
            <div className="px-4 py-8 text-center text-xs text-white/30">No requests yet.</div>
          ) : (
            tickets.map((ticket) => (
              <button
                key={ticket._id}
                type="button"
                onClick={() => setSelectedId(ticket._id)}
                className={`w-full px-4 py-3 text-left transition-colors border-l-2 ${
                  selectedId === ticket._id
                    ? "bg-white/6 border-sky-400"
                    : "border-transparent hover:bg-white/3"
                }`}
              >
                <div className="flex items-start gap-2">
                  <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${PRIORITY_DOT[ticket.priority] ?? "bg-white/30"}`} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-white/88">{ticket.title}</p>
                    <p className="mt-0.5 truncate text-xs text-white/35">{ticket.clientEmail ?? "Unknown"}</p>
                    <div className="mt-1.5 flex items-center gap-2">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${STATUS_STYLES[ticket.status] ?? "bg-white/10 text-white/45"}`}>
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

      {/* Right detail */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {selected ? (
          <RequestDetail
            key={selected._id}
            ticket={selected}
            onUpdate={handleTicketUpdate}
          />
        ) : (
          <div className="flex flex-1 items-center justify-center text-sm text-white/30">
            Select a request to view details
          </div>
        )}
      </div>
    </div>
  );
}

function RequestDetail({
  ticket,
  onUpdate,
}: {
  ticket: AdminPortalTicket;
  onUpdate: (updated: AdminPortalTicket) => void;
}) {
  const [status, setStatus] = useState(ticket.status);
  const [noteText, setNoteText] = useState("");
  const [savingStatus, setSavingStatus] = useState(false);
  const [savingNote, setSavingNote] = useState(false);
  const [error, setError] = useState("");

  // Build the notes list: merge legacy adminNotes (if any) as the oldest entry
  const notes: TicketNote[] = ticket.ticketNotes ?? [];
  const legacyNote = ticket.adminNotes && notes.length === 0 ? ticket.adminNotes : null;

  async function saveStatus() {
    if (status === ticket.status) return;
    setSavingStatus(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/portal-requests/${ticket._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update status");
      onUpdate({ ...ticket, ...data, status });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update status");
    } finally {
      setSavingStatus(false);
    }
  }

  async function addNote(e: React.FormEvent) {
    e.preventDefault();
    if (!noteText.trim()) return;
    setSavingNote(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/portal-requests/${ticket._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ noteText: noteText.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add note");
      onUpdate({ ...ticket, ...data });
      setNoteText("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add note");
    } finally {
      setSavingNote(false);
    }
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <div className="shrink-0 border-b border-white/8 px-6 py-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-white">{ticket.title}</h2>
            <p className="mt-0.5 text-xs text-white/40">
              {ticket.clientEmail ?? "Unknown client"}
              {ticket.projectName ? ` · ${ticket.projectName}` : ""}
              {` · ${new Date(ticket.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-white/8 px-2 py-0.5 text-xs text-white/50 capitalize">{ticket.priority}</span>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white outline-none focus:border-sky-500/50 [color-scheme:dark]"
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => void saveStatus()}
              disabled={savingStatus || status === ticket.status}
              className="rounded-xl bg-sky-500 px-3 py-1.5 text-sm font-semibold text-black disabled:opacity-40 hover:bg-sky-400 transition-colors"
            >
              {savingStatus ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
        {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
      </div>

      {/* Scrollable body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Description + attachments */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <p className="text-sm text-white/65 whitespace-pre-wrap leading-relaxed">{ticket.description}</p>

          {ticket.attachments?.length ? (
            <div className="mt-4 flex flex-wrap gap-2">
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
          ) : null}
        </div>

        {/* Notes panel */}
        <div className="flex w-80 shrink-0 flex-col border-l border-white/8">
          <div className="shrink-0 border-b border-white/8 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-white/40">Progress Notes</p>
          </div>

          {/* Notes list */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {notes.length === 0 && !legacyNote ? (
              <p className="text-xs text-white/25 text-center py-4">No notes yet.</p>
            ) : (
              <>
                {legacyNote && (
                  <div className="rounded-xl border border-white/8 bg-white/3 p-3">
                    <p className="text-xs text-white/25 mb-1">Legacy note</p>
                    <p className="text-sm text-white/70 whitespace-pre-wrap">{legacyNote}</p>
                  </div>
                )}
                {[...notes].reverse().map((note) => (
                  <div key={note._key} className="rounded-xl border border-white/8 bg-white/3 p-3">
                    <p className="text-xs text-white/30 mb-1.5">
                      {new Date(note.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      {" · "}
                      {new Date(note.createdAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                    </p>
                    <p className="text-sm text-white/75 whitespace-pre-wrap leading-relaxed">{note.text}</p>
                  </div>
                ))}
              </>
            )}
          </div>

          {/* Add note form */}
          <form onSubmit={(e) => void addNote(e)} className="shrink-0 border-t border-white/8 p-3 space-y-2">
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              rows={3}
              placeholder="Add a progress note…"
              className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none placeholder:text-white/20 focus:border-sky-500/50 transition-colors"
            />
            <button
              type="submit"
              disabled={savingNote || !noteText.trim()}
              className="w-full rounded-xl bg-white/8 py-2 text-sm font-medium text-white/70 hover:bg-white/12 hover:text-white disabled:opacity-40 transition-colors"
            >
              {savingNote ? "Adding…" : "Add note"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";

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
  attachments?: TicketAttachment[];
};

const STATUS_OPTIONS = [
  { value: "submitted", label: "Submitted" },
  { value: "in_progress", label: "In Progress" },
  { value: "waiting_on_client", label: "Waiting on Client" },
  { value: "completed", label: "Completed" },
  { value: "closed", label: "Closed" },
];

export default function AdminPortalRequestsPage() {
  const [tickets, setTickets] = useState<AdminPortalTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/portal-requests");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load requests");
      setTickets(data.tickets ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load requests");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  async function saveTicket(ticketId: string, status: string, adminNotes: string | null) {
    setSavingId(ticketId);
    setError("");
    try {
      const res = await fetch(`/api/admin/portal-requests/${ticketId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, adminNotes }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update request");
      setTickets((prev) => prev.map((ticket) => (ticket._id === ticketId ? data : ticket)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update request");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Client Requests</h1>
        <p className="text-sm text-white/40 mt-1">Review incoming work requests, update status, and keep clients informed.</p>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl p-3">
          {error}
        </div>
      )}

      <div className="grid gap-4">
        {loading ? (
          <div className="bg-white/3 border border-white/8 rounded-2xl p-6 text-sm text-white/40">Loading requests…</div>
        ) : tickets.length === 0 ? (
          <div className="bg-white/3 border border-white/8 rounded-2xl p-6 text-sm text-white/40">No client requests yet.</div>
        ) : (
          tickets.map((ticket) => (
            <RequestCard key={ticket._id} ticket={ticket} saving={savingId === ticket._id} onSave={saveTicket} />
          ))
        )}
      </div>
    </div>
  );
}

function RequestCard({
  ticket,
  saving,
  onSave,
}: {
  ticket: AdminPortalTicket;
  saving: boolean;
  onSave: (ticketId: string, status: string, adminNotes: string | null) => Promise<void>;
}) {
  const [status, setStatus] = useState(ticket.status);
  const [notes, setNotes] = useState(ticket.adminNotes ?? "");

  useEffect(() => {
    setStatus(ticket.status);
    setNotes(ticket.adminNotes ?? "");
  }, [ticket]);

  return (
    <div className="bg-white/3 border border-white/8 rounded-2xl p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-white">{ticket.title}</h2>
          <p className="text-xs text-white/35 mt-1">
            {ticket.clientEmail ?? "Unknown client"}
            {ticket.projectName ? ` • ${ticket.projectName}` : ""}
            {` • ${new Date(ticket.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/60">{ticket.priority}</span>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-sky-500/50 [color-scheme:dark]"
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>
      </div>

      <p className="text-sm text-white/65 mt-4 whitespace-pre-wrap">{ticket.description}</p>

      {ticket.attachments?.length ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {ticket.attachments.map((attachment) => (
            <a
              key={attachment._key ?? attachment.name}
              href={attachment.webViewLink ?? "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-xs text-sky-300 hover:bg-white/8 transition-colors"
            >
              {attachment.name}
            </a>
          ))}
        </div>
      ) : null}

      <div className="mt-4">
        <label className="text-xs text-white/40 mb-1.5 block">Admin note visible in the portal</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-sky-500/50 resize-none"
        />
      </div>

      <div className="mt-4 flex justify-end">
        <button
          onClick={() => void onSave(ticket._id, status, notes.trim() || null)}
          disabled={saving}
          className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 disabled:opacity-40 text-black font-semibold text-sm transition-colors"
        >
          {saving ? "Saving…" : "Save update"}
        </button>
      </div>
    </div>
  );
}

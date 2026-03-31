"use client";

import { useEffect, useRef, useState } from "react";

type PortalProject = { _id: string; name: string; status: string };
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
  attachments?: TicketAttachment[];
};

const STATUS_STYLES: Record<string, string> = {
  submitted: "bg-sky-500/15 text-sky-300",
  in_progress: "bg-amber-500/15 text-amber-300",
  waiting_on_client: "bg-violet-500/15 text-violet-300",
  completed: "bg-emerald-500/15 text-emerald-300",
  closed: "bg-white/10 text-white/50",
};

export default function PortalRequestsPage() {
  const [tickets, setTickets] = useState<PortalTicket[]>([]);
  const [projects, setProjects] = useState<PortalProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
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
      setTickets((prev) => [data, ...prev]);
      setForm({ title: "", description: "", projectId: "", priority: "medium" });
      if (fileRef.current) fileRef.current.value = "";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit request");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Requests</h1>
        <p className="text-sm text-white/40 mt-1">Submit updates, fixes, content changes, product additions, or anything you need us to handle.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr,0.9fr]">
        <form onSubmit={handleSubmit} className="bg-white/3 border border-white/8 rounded-2xl p-5 space-y-4">
          <div>
            <label className="text-xs text-white/50 mb-1.5 block">Request title</label>
            <input
              value={form.title}
              onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
              placeholder="Homepage update, product upload, bug fix..."
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
              rows={6}
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
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl p-3">
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={saving || !form.title.trim() || !form.description.trim()}
            className="px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 disabled:opacity-40 text-black font-semibold text-sm transition-colors"
          >
            {saving ? "Submitting…" : "Submit request"}
          </button>
        </form>

        <div className="bg-white/3 border border-white/8 rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-white mb-3">How this works</h2>
          <div className="space-y-3 text-sm text-white/55">
            <p>Your request goes straight into our client work queue tied to your portal account.</p>
            <p>We can review the uploaded assets, update the status, and leave notes back on the request.</p>
            <p>You’ll always see only your own requests and project context from this portal login.</p>
          </div>
        </div>
      </div>

      <div className="bg-white/3 border border-white/8 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-white/8">
          <h2 className="text-sm font-semibold text-white">Your requests</h2>
        </div>
        {loading ? (
          <div className="p-5 text-sm text-white/40">Loading requests…</div>
        ) : tickets.length === 0 ? (
          <div className="p-8 text-center text-sm text-white/35">No requests yet.</div>
        ) : (
          <div className="divide-y divide-white/5">
            {tickets.map((ticket) => (
              <div key={ticket._id} className="p-5">
                <div className="flex flex-wrap items-center gap-2 justify-between">
                  <div>
                    <p className="text-sm font-medium text-white">{ticket.title}</p>
                    <p className="text-xs text-white/35 mt-1">
                      {ticket.projectName ? `${ticket.projectName} • ` : ""}
                      {new Date(ticket.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_STYLES[ticket.status] ?? "bg-white/10 text-white/50"}`}>
                    {ticket.status.replaceAll("_", " ")}
                  </span>
                </div>
                <p className="text-sm text-white/65 mt-3 whitespace-pre-wrap">{ticket.description}</p>
                {ticket.attachments?.length ? (
                  <div className="mt-3 flex flex-wrap gap-2">
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
                {ticket.adminNotes && (
                  <div className="mt-4 rounded-xl bg-white/5 border border-white/10 p-3">
                    <p className="text-[11px] uppercase tracking-wide text-white/35 mb-1">Latest team note</p>
                    <p className="text-sm text-white/65 whitespace-pre-wrap">{ticket.adminNotes}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

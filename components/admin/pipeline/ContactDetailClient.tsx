"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Stage = { id: string; name: string };

type PipelineContact = {
  _id: string;
  _type: string;
  _createdAt: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  source: string | null;
  notes: string | null;
  owner: string | null;
  stage: string;
  stageEnteredAt: string;
  estimatedValue: number | null;
  stripeCustomerId: string | null;
  googleContactResourceName?: string | null;
  closedAt: string | null;
  driveFileUrl: string | null;
  driveFileName: string | null;
  followUpEventId: string | null;
};

type PipelineActivity = {
  _id: string;
  _createdAt: string;
  contactId: string;
  type: "created" | "note" | "stage_change" | "converted" | "follow_up";
  text: string | null;
  fromStage: string | null;
  toStage: string | null;
  author: string;
};

type GmailThread = {
  id: string;
  subject: string;
  snippet: string;
  date: number;
  isRead: boolean;
};

const SOURCE_OPTIONS = ["Referral", "Website", "LinkedIn", "Cold Outreach", "Event", "Other"];

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function ActivityIcon({ type }: { type: PipelineActivity["type"] }) {
  if (type === "created") {
    return (
      <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" className="text-white/40">
        <circle cx="12" cy="12" r="4" />
      </svg>
    );
  }
  if (type === "note") {
    return (
      <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" className="text-sky-400">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 9.75a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375m-13.5 3.01c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.184-4.183a1.14 1.14 0 01.778-.332 48.294 48.294 0 005.83-.498c1.585-.233 2.708-1.626 2.708-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
      </svg>
    );
  }
  if (type === "stage_change") {
    return (
      <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" className="text-yellow-400">
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
      </svg>
    );
  }
  if (type === "converted") {
    return (
      <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" className="text-green-400">
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
      </svg>
    );
  }
  if (type === "follow_up") {
    return (
      <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" className="text-purple-400">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 9v7.5" />
      </svg>
    );
  }
  return null;
}

export default function ContactDetailClient({
  contact: initialContact,
  stages,
  initialActivity,
}: {
  contact: PipelineContact;
  stages: Stage[];
  initialActivity: PipelineActivity[];
}) {
  const router = useRouter();
  const [contact, setContact] = useState<PipelineContact>(initialContact);
  const [form, setForm] = useState({
    name: initialContact.name,
    email: initialContact.email ?? "",
    phone: initialContact.phone ?? "",
    company: initialContact.company ?? "",
    source: initialContact.source ?? "",
    notes: initialContact.notes ?? "",
    owner: initialContact.owner ?? "",
    estimatedValue: initialContact.estimatedValue?.toString() ?? "",
    stage: initialContact.stage,
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [converting, setConverting] = useState(false);

  // Activity
  const [activity, setActivity] = useState<PipelineActivity[]>(initialActivity);
  const [noteText, setNoteText] = useState("");
  const [postingNote, setPostingNote] = useState(false);

  // Gmail threads
  const [threads, setThreads] = useState<GmailThread[]>([]);
  const [threadsError, setThreadsError] = useState<string | null>(null);
  const [threadsLoaded, setThreadsLoaded] = useState(false);

  // Follow-up
  const [followUpDate, setFollowUpDate] = useState("");
  const [followUpSummary, setFollowUpSummary] = useState("");
  const [followUpNote, setFollowUpNote] = useState("");
  const [schedulingFollowUp, setSchedulingFollowUp] = useState(false);

  // Drive
  const [driveUrl, setDriveUrl] = useState(initialContact.driveFileUrl ?? "");
  const [driveFileName, setDriveFileName] = useState(initialContact.driveFileName ?? "");
  const [linkingDrive, setLinkingDrive] = useState(false);

  // Load Gmail threads
  useEffect(() => {
    if (!contact.email || threadsLoaded) return;
    setThreadsLoaded(true);
    fetch(`/api/admin/pipeline/contacts/${contact._id}/emails`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error && !data.threads) {
          setThreadsError(data.error);
        } else {
          setThreads(data.threads ?? []);
          if (data.error) setThreadsError(data.error);
        }
      })
      .catch(() => setThreadsError("Failed to load threads"));
  }, [contact._id, contact.email, threadsLoaded]);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/pipeline/contacts/${contact._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim() || null,
          phone: form.phone.trim() || null,
          company: form.company.trim() || null,
          source: form.source || null,
          notes: form.notes.trim() || null,
          owner: form.owner.trim() || null,
          estimatedValue: form.estimatedValue ? Number(form.estimatedValue) : null,
          stage: form.stage,
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        setContact({ ...contact, ...updated });
        // Re-fetch activity in case stage change created a new activity
        const actRes = await fetch(`/api/admin/pipeline/contacts/${contact._id}/activity`);
        if (actRes.ok) {
          const acts = await actRes.json();
          setActivity(Array.isArray(acts) ? acts : []);
        }
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete "${contact.name}"? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      await fetch(`/api/admin/pipeline/contacts/${contact._id}`, { method: "DELETE" });
      router.push("/admin/pipeline");
    } finally {
      setDeleting(false);
    }
  }

  async function handleConvert() {
    if (!confirm(`Convert "${contact.name}" to a Stripe customer?`)) return;
    setConverting(true);
    try {
      const res = await fetch(`/api/admin/pipeline/contacts/${contact._id}/convert`, {
        method: "POST",
      });
      if (res.ok) {
        const data = await res.json();
        setContact({ ...contact, stripeCustomerId: data.stripeCustomerId });
        const actRes = await fetch(`/api/admin/pipeline/contacts/${contact._id}/activity`);
        if (actRes.ok) {
          const acts = await actRes.json();
          setActivity(Array.isArray(acts) ? acts : []);
        }
      }
    } finally {
      setConverting(false);
    }
  }

  async function handleAddNote() {
    if (!noteText.trim() || postingNote) return;
    setPostingNote(true);
    try {
      const res = await fetch(`/api/admin/pipeline/contacts/${contact._id}/activity`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: noteText.trim(), type: "note" }),
      });
      if (res.ok) {
        const act = await res.json();
        setActivity((prev) => [...prev, act]);
        setNoteText("");
      }
    } finally {
      setPostingNote(false);
    }
  }

  async function handleScheduleFollowUp() {
    if (!followUpSummary.trim() || !followUpDate || schedulingFollowUp) return;
    setSchedulingFollowUp(true);
    try {
      const res = await fetch(`/api/admin/pipeline/contacts/${contact._id}/follow-up`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          summary: followUpSummary.trim(),
          date: followUpDate,
          note: followUpNote.trim() || undefined,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.followUpEventId) {
          setContact({ ...contact, followUpEventId: data.followUpEventId });
        }
        const actRes = await fetch(`/api/admin/pipeline/contacts/${contact._id}/activity`);
        if (actRes.ok) {
          const acts = await actRes.json();
          setActivity(Array.isArray(acts) ? acts : []);
        }
        setFollowUpDate("");
        setFollowUpSummary("");
        setFollowUpNote("");
      }
    } finally {
      setSchedulingFollowUp(false);
    }
  }

  async function handleLinkDrive() {
    if (!driveUrl.trim() || linkingDrive) return;
    setLinkingDrive(true);
    try {
      const name = driveFileName.trim() || "Drive file";
      const res = await fetch(`/api/admin/pipeline/contacts/${contact._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          driveFileUrl: driveUrl.trim(),
          driveFileName: name,
        }),
      });
      if (res.ok) {
        setContact({ ...contact, driveFileUrl: driveUrl.trim(), driveFileName: name });
      }
    } catch {
      // ignore
    } finally {
      setLinkingDrive(false);
    }
  }

  async function handleRemoveDrive() {
    const res = await fetch(`/api/admin/pipeline/contacts/${contact._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ driveFileUrl: null, driveFileName: null }),
    });
    if (res.ok) {
      setContact({ ...contact, driveFileUrl: null, driveFileName: null });
      setDriveUrl("");
      setDriveFileName("");
    }
  }

  const isDirty =
    form.name !== contact.name ||
    form.email !== (contact.email ?? "") ||
    form.phone !== (contact.phone ?? "") ||
    form.company !== (contact.company ?? "") ||
    form.source !== (contact.source ?? "") ||
    form.notes !== (contact.notes ?? "") ||
    form.owner !== (contact.owner ?? "") ||
    form.estimatedValue !== (contact.estimatedValue?.toString() ?? "") ||
    form.stage !== contact.stage;

  return (
    <div className="flex flex-col lg:flex-row gap-8">
      {/* Left column — editable form */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/admin/pipeline" className="text-white/30 hover:text-white/70 transition-colors text-sm flex-shrink-0">
            ← Pipeline
          </Link>
        </div>

        <div className="space-y-5">
          {/* Name */}
          <div>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full bg-transparent text-white text-2xl font-semibold outline-none border-b border-transparent focus:border-white/20 pb-1 transition-colors placeholder-white/20"
              placeholder="Contact name"
            />
          </div>

          {/* Stripe badge or Convert button */}
          <div>
            {contact.stripeCustomerId ? (
              <a
                href={`https://dashboard.stripe.com/customers/${contact.stripeCustomerId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-green-400/10 text-green-400 hover:bg-green-400/20 transition-colors font-semibold"
              >
                <svg width="10" height="10" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" />
                </svg>
                Stripe Customer
              </a>
            ) : (
              <button
                onClick={handleConvert}
                disabled={converting}
                className="text-xs px-3 py-1.5 rounded-xl border border-white/10 bg-white/4 hover:bg-white/8 text-white/60 hover:text-white transition-colors disabled:opacity-40"
              >
                {converting ? "Converting…" : "Convert to Client"}
              </button>
            )}
          </div>

          {/* Email + Phone */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-white/50 mb-1.5">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="email@example.com"
                className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-white/20 outline-none focus:border-sky-500/50 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs text-white/50 mb-1.5">Phone</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="+1 555 000 0000"
                className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-white/20 outline-none focus:border-sky-500/50 transition-colors"
              />
            </div>
          </div>

          {/* Company */}
          <div>
            <label className="block text-xs text-white/50 mb-1.5">Company</label>
            <input
              value={form.company}
              onChange={(e) => setForm({ ...form, company: e.target.value })}
              placeholder="Company name"
              className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-white/20 outline-none focus:border-sky-500/50 transition-colors"
            />
          </div>

          {/* Source + Stage */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-white/50 mb-1.5">Source</label>
              <select
                value={form.source}
                onChange={(e) => setForm({ ...form, source: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-sky-500/50 [color-scheme:dark]"
              >
                <option value="">— None —</option>
                {SOURCE_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-white/50 mb-1.5">Stage</label>
              <select
                value={form.stage}
                onChange={(e) => setForm({ ...form, stage: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-sky-500/50 [color-scheme:dark]"
              >
                {stages.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Owner + Value */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-white/50 mb-1.5">Owner</label>
              <input
                value={form.owner}
                onChange={(e) => setForm({ ...form, owner: e.target.value })}
                placeholder="Name or email"
                className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-white/20 outline-none focus:border-sky-500/50 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs text-white/50 mb-1.5">Estimated Value</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 text-sm">$</span>
                <input
                  type="number"
                  min={0}
                  value={form.estimatedValue}
                  onChange={(e) => setForm({ ...form, estimatedValue: e.target.value })}
                  placeholder="0"
                  className="w-full pl-7 pr-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-white/20 outline-none focus:border-sky-500/50 transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs text-white/50 mb-1.5">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Notes…"
              rows={4}
              className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-white/20 outline-none focus:border-sky-500/50 transition-colors resize-none"
            />
          </div>

          {/* Save button */}
          {isDirty && (
            <button
              onClick={handleSave}
              disabled={saving || !form.name.trim()}
              className="w-full py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 disabled:opacity-40 text-black font-semibold text-sm transition-colors"
            >
              {saving ? "Saving…" : "Save Changes"}
            </button>
          )}

          {/* Drive attachment */}
          <div>
            <label className="block text-xs text-white/50 uppercase tracking-wide mb-2">Google Drive Attachment</label>
            {contact.driveFileUrl ? (
              <div className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-white/4 border border-white/8">
                <a
                  href={contact.driveFileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sky-400 text-sm hover:underline truncate flex items-center gap-1.5"
                >
                  <span>📎</span>
                  <span className="truncate">{contact.driveFileName || "Drive file"}</span>
                </a>
                <button
                  onClick={handleRemoveDrive}
                  className="text-xs text-white/30 hover:text-red-400 transition-colors ml-2 flex-shrink-0"
                >
                  Remove
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <input
                  value={driveUrl}
                  onChange={(e) => setDriveUrl(e.target.value)}
                  placeholder="Paste Google Drive link…"
                  className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-white/20 outline-none focus:border-sky-500/50 transition-colors"
                />
                <div className="flex gap-2">
                  <input
                    value={driveFileName}
                    onChange={(e) => setDriveFileName(e.target.value)}
                    placeholder="Display name (optional)"
                    className="flex-1 px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-white/20 outline-none focus:border-sky-500/50 transition-colors"
                  />
                  <button
                    onClick={handleLinkDrive}
                    disabled={!driveUrl.trim() || linkingDrive}
                    className="px-3 py-2 rounded-lg bg-white/8 hover:bg-white/14 disabled:opacity-40 text-white text-sm transition-colors flex-shrink-0"
                  >
                    Link
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Danger zone */}
          <div className="pt-4 border-t border-white/8">
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="text-sm text-red-400/50 hover:text-red-400 transition-colors"
            >
              {deleting ? "Deleting…" : "Delete contact"}
            </button>
          </div>

          {/* Created at */}
          <p className="text-[11px] text-white/20">
            Created {new Date(contact._createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
          </p>
        </div>
      </div>

      {/* Right column — activity, gmail, follow-up */}
      <div className="w-full lg:w-96 flex-shrink-0 space-y-6">
        {/* Activity log */}
        <div className="bg-white/3 border border-white/8 rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-white/60 uppercase tracking-widest mb-4">Activity</h3>

          {activity.length === 0 ? (
            <p className="text-xs text-white/25 mb-4">No activity yet.</p>
          ) : (
            <div className="space-y-3 mb-4 max-h-64 overflow-y-auto pr-1">
              {activity.map((act) => (
                <div key={act._id} className="flex gap-2.5">
                  <div className="mt-0.5 flex-shrink-0 w-5 h-5 flex items-center justify-center">
                    <ActivityIcon type={act.type} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-white/60 leading-relaxed">{act.text}</p>
                    <p className="text-[10px] text-white/25 mt-0.5">{timeAgo(act._createdAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add note */}
          <div className="space-y-2 border-t border-white/8 pt-4">
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleAddNote();
              }}
              placeholder="Add a note… (⌘+Enter)"
              rows={2}
              className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-white/20 outline-none focus:border-sky-500/50 transition-colors resize-none"
            />
            <button
              onClick={handleAddNote}
              disabled={!noteText.trim() || postingNote}
              className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 disabled:opacity-40 text-black font-semibold text-sm transition-colors"
            >
              {postingNote ? "Adding…" : "Add Note"}
            </button>
          </div>
        </div>

        {/* Gmail threads */}
        {contact.email && (
          <div className="bg-white/3 border border-white/8 rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-white/60 uppercase tracking-widest mb-4">Email Threads</h3>
            {threadsError && threads.length === 0 ? (
              <p className="text-xs text-white/25">{threadsError}</p>
            ) : threads.length === 0 ? (
              <p className="text-xs text-white/25">No threads found.</p>
            ) : (
              <div className="space-y-3">
                {threads.map((thread) => (
                  <div key={thread.id} className="border-b border-white/5 pb-3 last:border-0 last:pb-0">
                    <p className={`text-sm font-medium truncate ${thread.isRead ? "text-white/60" : "text-white"}`}>
                      {thread.subject}
                    </p>
                    <p className="text-xs text-white/30 mt-0.5 line-clamp-2">{thread.snippet}</p>
                    <p className="text-[10px] text-white/20 mt-1">
                      {new Date(thread.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Follow-up scheduler */}
        <div className="bg-white/3 border border-white/8 rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-white/60 uppercase tracking-widest mb-4">Follow-Up</h3>

          {contact.followUpEventId && (
            <div className="mb-3 px-3 py-2 rounded-xl bg-purple-400/10 border border-purple-400/20">
              <p className="text-xs text-purple-300 font-semibold">Follow-up scheduled</p>
              <p className="text-[10px] text-purple-300/60 mt-0.5">Event ID: {contact.followUpEventId}</p>
            </div>
          )}

          <div className="space-y-3">
            <div>
              <label className="block text-xs text-white/50 mb-1.5">Summary</label>
              <input
                value={followUpSummary}
                onChange={(e) => setFollowUpSummary(e.target.value)}
                placeholder="Call with client…"
                className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-white/20 outline-none focus:border-sky-500/50 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs text-white/50 mb-1.5">Date</label>
              <input
                type="date"
                value={followUpDate}
                onChange={(e) => setFollowUpDate(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-sky-500/50 [color-scheme:dark]"
              />
            </div>
            <div>
              <label className="block text-xs text-white/50 mb-1.5">Note (optional)</label>
              <input
                value={followUpNote}
                onChange={(e) => setFollowUpNote(e.target.value)}
                placeholder="Any details…"
                className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-white/20 outline-none focus:border-sky-500/50 transition-colors"
              />
            </div>
            <button
              onClick={handleScheduleFollowUp}
              disabled={!followUpSummary.trim() || !followUpDate || schedulingFollowUp}
              className="w-full px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 disabled:opacity-40 text-black font-semibold text-sm transition-colors"
            >
              {schedulingFollowUp ? "Scheduling…" : "Schedule"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

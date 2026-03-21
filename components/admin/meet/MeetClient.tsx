"use client";

import { useState, useEffect, useCallback } from "react";
import { DateTime } from "luxon";

type MeetMeeting = {
  id: string;
  calendarId: string;
  summary: string;
  description?: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  meetLink: string;
  attendees?: { email: string; displayName?: string; responseStatus?: string }[];
  status: string;
  allDay: boolean;
};

type NewMeetingForm = {
  summary: string;
  date: string;
  startTime: string;
  endTime: string;
  description: string;
  attendees: string;
};

function formatMeetingTime(meeting: MeetMeeting): string {
  const dt = meeting.start.dateTime;
  if (!dt) return meeting.start.date ?? "";
  return DateTime.fromISO(dt).toFormat("EEE, MMM d · h:mm a");
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  async function handleCopy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <button
      onClick={handleCopy}
      className="px-2 py-1 rounded-lg text-xs text-white/40 hover:text-white hover:bg-white/8 transition-colors"
      title="Copy link"
    >
      {copied ? (
        <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
        </svg>
      ) : (
        <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
        </svg>
      )}
    </button>
  );
}

export default function MeetClient() {
  const [meetings, setMeetings] = useState<MeetMeeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNewMeeting, setShowNewMeeting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [quickMeeting, setQuickMeeting] = useState<MeetMeeting | null>(null);
  const [quickCreating, setQuickCreating] = useState(false);

  const today = DateTime.now();
  const [form, setForm] = useState<NewMeetingForm>({
    summary: "",
    date: today.toISODate() ?? "",
    startTime: "09:00",
    endTime: "10:00",
    description: "",
    attendees: "",
  });

  const fetchMeetings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/meet/meetings");
      if (!res.ok) throw new Error("Failed to load meetings");
      const data = await res.json();
      setMeetings(Array.isArray(data) ? data : []);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMeetings();
  }, [fetchMeetings]);

  async function handleCreateMeeting() {
    if (!form.summary.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const attendeeEmails = form.attendees.trim()
        ? form.attendees
            .split(/[\n,]/)
            .map((e) => e.trim())
            .filter(Boolean)
        : undefined;

      const res = await fetch("/api/admin/meet/meetings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          summary: form.summary,
          description: form.description || undefined,
          startDateTime: `${form.date}T${form.startTime}:00`,
          endDateTime: `${form.date}T${form.endTime}:00`,
          attendeeEmails,
        }),
      });
      if (!res.ok) throw new Error("Failed to create meeting");
      await fetchMeetings();
      setShowNewMeeting(false);
      setForm((prev) => ({ ...prev, summary: "", description: "", attendees: "" }));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteMeeting(meeting: MeetMeeting) {
    if (!confirm(`Delete "${meeting.summary}"?`)) return;
    try {
      const res = await fetch(
        `/api/admin/meet/meetings/${meeting.id}?calendarId=${encodeURIComponent(meeting.calendarId)}`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error("Delete failed");
      setMeetings((prev) => prev.filter((m) => m.id !== meeting.id));
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function handleQuickMeeting() {
    setQuickCreating(true);
    setError(null);
    try {
      const now = DateTime.now();
      const res = await fetch("/api/admin/meet/meetings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          summary: "Quick Meeting",
          startDateTime: now.toISO(),
          endDateTime: now.plus({ hours: 1 }).toISO(),
        }),
      });
      if (!res.ok) throw new Error("Failed to create quick meeting");
      const created = await res.json();
      setQuickMeeting(created);
      await fetchMeetings();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setQuickCreating(false);
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-semibold text-white">Meet</h1>
        <button
          onClick={() => setShowNewMeeting(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm text-white bg-sky-500 hover:bg-sky-400 transition-colors"
        >
          <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          New Meeting
        </button>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        {/* Left: upcoming meetings list */}
        <div className="bg-white/3 border border-white/8 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-white/8">
            <h2 className="text-sm font-medium text-white">Upcoming Meetings</h2>
          </div>
          {loading ? (
            <div className="p-6 space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-16 rounded-xl bg-white/5 animate-pulse" />
              ))}
            </div>
          ) : meetings.length === 0 ? (
            <div className="p-12 text-center text-white/30 text-sm">No upcoming meetings</div>
          ) : (
            <div className="divide-y divide-white/5">
              {meetings.map((meeting) => (
                <div key={meeting.id} className="flex items-start gap-3 px-5 py-4 hover:bg-white/3 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-white truncate">{meeting.summary}</div>
                    <div className="text-xs text-white/50 mt-0.5">{formatMeetingTime(meeting)}</div>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <a
                        href={meeting.meetLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs bg-green-500/15 text-green-400 hover:bg-green-500/25 transition-colors"
                      >
                        <svg width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
                        </svg>
                        Join
                      </a>
                      <CopyButton text={meeting.meetLink} />
                      {meeting.attendees && meeting.attendees.length > 0 && (
                        <span className="text-xs text-white/30">
                          {meeting.attendees.length} attendee{meeting.attendees.length !== 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteMeeting(meeting)}
                    className="flex-shrink-0 p-1.5 rounded-lg text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-colors mt-0.5"
                    title="Delete meeting"
                  >
                    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: quick-create card */}
        <div className="space-y-4">
          <div className="bg-white/3 border border-white/8 rounded-2xl p-5">
            <h2 className="text-sm font-medium text-white mb-1">Start instant meeting</h2>
            <p className="text-xs text-white/40 mb-4">Creates a 1-hour Google Meet starting now.</p>
            <button
              onClick={handleQuickMeeting}
              disabled={quickCreating}
              className="w-full px-4 py-2.5 rounded-xl text-sm text-white bg-sky-500 hover:bg-sky-400 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              {quickCreating ? (
                <>
                  <svg className="animate-spin" width="14" height="14" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Creating…
                </>
              ) : (
                <>
                  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
                  </svg>
                  Start now
                </>
              )}
            </button>

            {quickMeeting && (
              <div className="mt-4 p-3 bg-green-500/10 border border-green-500/20 rounded-xl">
                <div className="text-xs text-green-400 font-medium mb-2">Meeting created!</div>
                <div className="text-xs text-white/60 mb-2 truncate">{quickMeeting.summary}</div>
                <div className="flex items-center gap-2">
                  <a
                    href={quickMeeting.meetLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 text-center px-3 py-2 rounded-lg text-xs text-white bg-green-500 hover:bg-green-400 transition-colors font-medium"
                  >
                    Join now
                  </a>
                  <CopyButton text={quickMeeting.meetLink} />
                </div>
                <div className="mt-2 text-xs text-white/30 break-all">{quickMeeting.meetLink}</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* New Meeting Modal */}
      {showNewMeeting && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setShowNewMeeting(false)}
        >
          <div
            className="bg-[#111] border border-white/10 rounded-2xl p-6 w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-white">New Meeting</h2>
              <button
                onClick={() => setShowNewMeeting(false)}
                className="text-white/40 hover:text-white transition-colors"
              >
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-white/40 uppercase tracking-wider block mb-1">Title *</label>
                <input
                  type="text"
                  value={form.summary}
                  onChange={(e) => setForm((prev) => ({ ...prev, summary: e.target.value }))}
                  placeholder="Meeting title"
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-white/30 outline-none focus:border-sky-500/50"
                />
              </div>

              <div>
                <label className="text-xs text-white/40 uppercase tracking-wider block mb-1">Date</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm((prev) => ({ ...prev, date: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-sky-500/50"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-white/40 uppercase tracking-wider block mb-1">Start time</label>
                  <input
                    type="time"
                    value={form.startTime}
                    onChange={(e) => setForm((prev) => ({ ...prev, startTime: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-sky-500/50"
                  />
                </div>
                <div>
                  <label className="text-xs text-white/40 uppercase tracking-wider block mb-1">End time</label>
                  <input
                    type="time"
                    value={form.endTime}
                    onChange={(e) => setForm((prev) => ({ ...prev, endTime: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-sky-500/50"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-white/40 uppercase tracking-wider block mb-1">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Optional"
                  rows={2}
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-white/30 outline-none focus:border-sky-500/50 resize-none"
                />
              </div>

              <div>
                <label className="text-xs text-white/40 uppercase tracking-wider block mb-1">
                  Attendees (one per line or comma-separated)
                </label>
                <textarea
                  value={form.attendees}
                  onChange={(e) => setForm((prev) => ({ ...prev, attendees: e.target.value }))}
                  placeholder="email@example.com"
                  rows={3}
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-white/30 outline-none focus:border-sky-500/50 resize-none"
                />
              </div>
            </div>

            {error && (
              <div className="mt-3 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}

            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setShowNewMeeting(false)}
                className="flex-1 px-4 py-2 rounded-xl text-sm text-white/60 hover:text-white bg-white/5 hover:bg-white/10 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateMeeting}
                disabled={submitting || !form.summary.trim()}
                className="flex-1 px-4 py-2 rounded-xl text-sm text-white bg-sky-500 hover:bg-sky-400 disabled:opacity-50 transition-colors"
              >
                {submitting ? "Creating…" : "Create Meeting"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

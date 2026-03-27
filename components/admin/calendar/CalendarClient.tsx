"use client";

import { useState, useEffect, useRef } from "react";
import { DateTime } from "luxon";

type CalendarEvent = {
  id: string;
  summary: string;
  description?: string;
  location?: string;
  start: { dateTime?: string; date?: string; timeZone?: string };
  end: { dateTime?: string; date?: string; timeZone?: string };
  status: string;
  htmlLink?: string;
  colorId?: string;
  attendees?: { email: string; displayName?: string; responseStatus?: string }[];
  allDay: boolean;
  calendarId: string;
};

type GoogleCalendar = {
  id: string;
  summary: string;
  backgroundColor?: string;
  foregroundColor?: string;
  primary?: boolean;
  selected?: boolean;
};

type NewEventForm = {
  summary: string;
  date: string;
  startTime: string;
  endTime: string;
  allDay: boolean;
  location: string;
  description: string;
  calendarId: string;
  attendees: string;
};

function getEventDate(event: CalendarEvent): string {
  const raw = event.start.dateTime ?? event.start.date ?? "";
  return raw.slice(0, 10);
}

function getEventTime(event: CalendarEvent): string {
  if (event.allDay) return "All day";
  const dt = event.start.dateTime;
  if (!dt) return "";
  return DateTime.fromISO(dt).toFormat("h:mm a");
}

function getEventEndTime(event: CalendarEvent): string {
  const dt = event.end.dateTime;
  if (!dt) return "";
  return DateTime.fromISO(dt).toFormat("h:mm a");
}

function getDaysInMonth(year: number, month: number) {
  // month is 1-based
  const firstDay = new Date(year, month - 1, 1);
  const startDow = firstDay.getDay(); // 0=Sun
  const cells: { date: Date; currentMonth: boolean }[] = [];
  const start = new Date(firstDay);
  start.setDate(start.getDate() - startDow);
  for (let i = 0; i < 42; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    cells.push({ date: d, currentMonth: d.getMonth() === month - 1 });
  }
  return cells;
}

function buildEventDateTime(date: string, time: string): string {
  return (
    DateTime.fromISO(`${date}T${time}`, { zone: "local" }).toISO({
      suppressMilliseconds: true,
      includeOffset: true,
    }) ?? `${date}T${time}:00`
  );
}

export default function CalendarClient() {
  const [calendars, setCalendars] = useState<GoogleCalendar[]>([]);
  const [selectedCalendarId, setSelectedCalendarId] = useState<string>("primary");
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const today = DateTime.now();
  const [viewMonth, setViewMonth] = useState<number>(today.month);
  const [viewYear, setViewYear] = useState<number>(today.year);
  const [selectedDate, setSelectedDate] = useState<string>(today.toISODate() ?? "");

  const [showNewEvent, setShowNewEvent] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [newEventForm, setNewEventForm] = useState<NewEventForm>({
    summary: "",
    date: today.toISODate() ?? "",
    startTime: "09:00",
    endTime: "10:00",
    allDay: false,
    location: "",
    description: "",
    calendarId: "primary",
    attendees: "",
  });

  const eventListRef = useRef<HTMLDivElement>(null);

  // Load calendars
  useEffect(() => {
    async function fetchCalendars() {
      try {
        const res = await fetch("/api/admin/calendar/calendars");
        if (!res.ok) return;
        const data = await res.json();
        setCalendars(data);
        const primary = data.find((c: GoogleCalendar) => c.primary);
        if (primary) {
          setSelectedCalendarId(primary.id);
          setNewEventForm((prev) => ({ ...prev, calendarId: primary.id }));
        }
      } catch {
        // ignore
      }
    }
    fetchCalendars();
  }, []);

  // Load events for the current view month
  useEffect(() => {
    async function fetchEvents() {
      setLoading(true);
      setError(null);
      try {
        const timeMin = DateTime.fromObject({ year: viewYear, month: viewMonth, day: 1 }).startOf("month").toISO();
        const timeMax = DateTime.fromObject({ year: viewYear, month: viewMonth, day: 1 }).endOf("month").toISO();
        const params = new URLSearchParams({
          calendarId: selectedCalendarId,
          timeMin: timeMin ?? "",
          timeMax: timeMax ?? "",
          maxResults: "200",
        });
        const res = await fetch(`/api/admin/calendar/events?${params.toString()}`);
        if (!res.ok) throw new Error("Failed to load events");
        const data = await res.json();
        setEvents(data.events ?? []);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    }
    fetchEvents();
  }, [selectedCalendarId, viewMonth, viewYear]);

  const calendarCells = getDaysInMonth(viewYear, viewMonth);
  const monthLabel = DateTime.fromObject({ year: viewYear, month: viewMonth }).toFormat("MMMM yyyy");

  function prevMonth() {
    if (viewMonth === 1) { setViewMonth(12); setViewYear(viewYear - 1); }
    else setViewMonth(viewMonth - 1);
  }
  function nextMonth() {
    if (viewMonth === 12) { setViewMonth(1); setViewYear(viewYear + 1); }
    else setViewMonth(viewMonth + 1);
  }

  // Events by date
  const eventsByDate: Record<string, CalendarEvent[]> = {};
  for (const e of events) {
    const d = getEventDate(e);
    if (!eventsByDate[d]) eventsByDate[d] = [];
    eventsByDate[d].push(e);
  }

  // Events for selected date and around it (sorted unique dates in month)
  const sortedDates = Object.keys(eventsByDate).sort();
  const visibleDates = sortedDates.filter((d) => {
    const dt = DateTime.fromISO(d);
    return dt.month === viewMonth && dt.year === viewYear;
  });

  function handleDayClick(date: Date) {
    const iso = DateTime.fromJSDate(date).toISODate() ?? "";
    setSelectedDate(iso);
    // Scroll to date in event list
    setTimeout(() => {
      const el = document.getElementById(`event-date-${iso}`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  }

  async function handleCreateEvent() {
    if (!newEventForm.summary.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        calendarId: newEventForm.calendarId,
        summary: newEventForm.summary,
        location: newEventForm.location || undefined,
        description: newEventForm.description || undefined,
      };

      if (newEventForm.allDay) {
        body.start = { date: newEventForm.date };
        body.end = { date: newEventForm.date };
      } else {
        body.start = { dateTime: buildEventDateTime(newEventForm.date, newEventForm.startTime) };
        body.end = { dateTime: buildEventDateTime(newEventForm.date, newEventForm.endTime) };
      }

      if (newEventForm.attendees.trim()) {
        body.attendees = newEventForm.attendees
          .split(",")
          .map((e) => ({ email: e.trim() }))
          .filter((a) => a.email);
      }

      const res = await fetch("/api/admin/calendar/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to create event");
      }
      const created = await res.json();
      setEvents((prev) => [...prev, created]);
      setShowNewEvent(false);
      setNewEventForm((prev) => ({
        ...prev,
        summary: "",
        location: "",
        description: "",
        attendees: "",
      }));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteEvent(event: CalendarEvent) {
    if (!confirm(`Delete "${event.summary}"?`)) return;
    try {
      const res = await fetch(
        `/api/admin/calendar/events/${event.id}?calendarId=${encodeURIComponent(event.calendarId)}`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error("Delete failed");
      setEvents((prev) => prev.filter((e) => e.id !== event.id));
      setSelectedEvent(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  const selectedCalendar = calendars.find((c) => c.id === selectedCalendarId);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-5">
        <h1 className="text-xl sm:text-2xl font-semibold text-white">Calendar</h1>
        <div className="flex items-center gap-2">
          {/* Calendar selector */}
          {calendars.length > 0 && (
            <select
              value={selectedCalendarId}
              onChange={(e) => setSelectedCalendarId(e.target.value)}
              className="max-w-[140px] sm:max-w-none px-2 sm:px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-sky-500/50 truncate"
            >
              {calendars.map((cal) => (
                <option key={cal.id} value={cal.id} style={{ backgroundColor: "#0a0a0a" }}>
                  {cal.primary ? "Primary" : cal.summary}
                </option>
              ))}
            </select>
          )}
          <button
            onClick={() => setShowNewEvent(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm text-white bg-sky-500 hover:bg-sky-400 transition-colors whitespace-nowrap"
          >
            <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            <span className="hidden sm:inline">New Event</span>
            <span className="sm:hidden">New</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-4 sm:gap-6">
        {/* Left: mini month grid */}
        <div className="bg-white/3 border border-white/8 rounded-2xl p-4 h-fit">
          {/* Month nav */}
          <div className="flex items-center justify-between mb-4">
            <button onClick={prevMonth} className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/8 transition-colors">
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
            </button>
            <span className="text-sm font-medium text-white">{monthLabel}</span>
            <button onClick={nextMonth} className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/8 transition-colors">
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </button>
          </div>

          {/* Day-of-week headers */}
          <div className="grid grid-cols-7 mb-1">
            {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
              <div key={d} className="text-center text-xs text-white/30 py-1">{d}</div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7">
            {calendarCells.map(({ date, currentMonth }, i) => {
              const iso = DateTime.fromJSDate(date).toISODate() ?? "";
              const isToday = iso === (today.toISODate() ?? "");
              const isSelected = iso === selectedDate;
              const hasEvents = !!eventsByDate[iso]?.length;
              return (
                <button
                  key={i}
                  onClick={() => handleDayClick(date)}
                  className={`relative flex flex-col items-center py-2 rounded-lg transition-colors text-xs min-h-[40px] ${
                    !currentMonth ? "text-white/20" : "text-white/80"
                  } ${isSelected ? "bg-sky-500/20" : "hover:bg-white/8"}`}
                >
                  <span className={`w-7 h-7 flex items-center justify-center rounded-full text-sm ${isToday ? "bg-sky-500 text-white font-semibold" : ""}`}>
                    {date.getDate()}
                  </span>
                  {hasEvents && (
                    <span
                      className="w-1 h-1 rounded-full mt-0.5"
                      style={{ backgroundColor: selectedCalendar?.backgroundColor ?? "#38bdf8" }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: event list */}
        <div ref={eventListRef} className="bg-white/3 border border-white/8 rounded-2xl overflow-hidden">
          {loading ? (
            <div className="p-6 space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 rounded-xl bg-white/5 animate-pulse" />
              ))}
            </div>
          ) : visibleDates.length === 0 ? (
            <div className="p-12 text-center text-white/30 text-sm">No events this month</div>
          ) : (
            <div className="divide-y divide-white/5">
              {visibleDates.map((dateStr) => {
                const dateEvents = eventsByDate[dateStr] ?? [];
                const dt = DateTime.fromISO(dateStr);
                const isToday = dateStr === (today.toISODate() ?? "");
                return (
                  <div key={dateStr} id={`event-date-${dateStr}`} className="p-4">
                    <div className={`text-xs font-semibold uppercase tracking-wider mb-3 ${isToday ? "text-sky-400" : "text-white/40"}`}>
                      {dt.toFormat("EEEE, MMMM d")}
                      {isToday && <span className="ml-2 text-sky-400">Today</span>}
                    </div>
                    <div className="space-y-2">
                      {dateEvents.map((event) => (
                        <button
                          key={event.id}
                          onClick={() => setSelectedEvent(event)}
                          className="w-full text-left flex items-start gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 transition-colors group"
                        >
                          <div
                            className="w-1 rounded-full mt-1 flex-shrink-0 self-stretch min-h-[1rem]"
                            style={{ backgroundColor: selectedCalendar?.backgroundColor ?? "#38bdf8" }}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm text-white/80 font-medium truncate">{event.summary}</div>
                            <div className="text-xs text-white/40 mt-0.5 flex items-center gap-2 flex-wrap">
                              <span>{event.allDay ? "All day" : `${getEventTime(event)} – ${getEventEndTime(event)}`}</span>
                              {event.location && (
                                <>
                                  <span className="text-white/20">·</span>
                                  <span className="truncate">{event.location}</span>
                                </>
                              )}
                              {event.attendees && event.attendees.length > 0 && (
                                <>
                                  <span className="text-white/20">·</span>
                                  <span>{event.attendees.length} attendee{event.attendees.length !== 1 ? "s" : ""}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* New Event Modal */}
      {showNewEvent && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 sm:p-4" onClick={() => setShowNewEvent(false)}>
          <div className="bg-[#111] border border-white/10 rounded-t-2xl sm:rounded-2xl p-5 sm:p-6 w-full sm:max-w-md max-h-[92dvh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-white">New Event</h2>
              <button onClick={() => setShowNewEvent(false)} className="text-white/40 hover:text-white transition-colors">
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
                  value={newEventForm.summary}
                  onChange={(e) => setNewEventForm((prev) => ({ ...prev, summary: e.target.value }))}
                  placeholder="Event title"
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-white/30 outline-none focus:border-sky-500/50"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="allDay"
                  checked={newEventForm.allDay}
                  onChange={(e) => setNewEventForm((prev) => ({ ...prev, allDay: e.target.checked }))}
                  className="rounded"
                />
                <label htmlFor="allDay" className="text-sm text-white/60 cursor-pointer">All day</label>
              </div>

              <div>
                <label className="text-xs text-white/40 uppercase tracking-wider block mb-1">Date</label>
                <input
                  type="date"
                  value={newEventForm.date}
                  onChange={(e) => setNewEventForm((prev) => ({ ...prev, date: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-sky-500/50"
                />
              </div>

              {!newEventForm.allDay && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-white/40 uppercase tracking-wider block mb-1">Start time</label>
                    <input
                      type="time"
                      value={newEventForm.startTime}
                      onChange={(e) => setNewEventForm((prev) => ({ ...prev, startTime: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-sky-500/50"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-white/40 uppercase tracking-wider block mb-1">End time</label>
                    <input
                      type="time"
                      value={newEventForm.endTime}
                      onChange={(e) => setNewEventForm((prev) => ({ ...prev, endTime: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-sky-500/50"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="text-xs text-white/40 uppercase tracking-wider block mb-1">Location</label>
                <input
                  type="text"
                  value={newEventForm.location}
                  onChange={(e) => setNewEventForm((prev) => ({ ...prev, location: e.target.value }))}
                  placeholder="Optional"
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-white/30 outline-none focus:border-sky-500/50"
                />
              </div>

              <div>
                <label className="text-xs text-white/40 uppercase tracking-wider block mb-1">Description</label>
                <textarea
                  value={newEventForm.description}
                  onChange={(e) => setNewEventForm((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Optional"
                  rows={2}
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-white/30 outline-none focus:border-sky-500/50 resize-none"
                />
              </div>

              {calendars.length > 0 && (
                <div>
                  <label className="text-xs text-white/40 uppercase tracking-wider block mb-1">Calendar</label>
                  <select
                    value={newEventForm.calendarId}
                    onChange={(e) => setNewEventForm((prev) => ({ ...prev, calendarId: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-sky-500/50"
                  >
                    {calendars.map((cal) => (
                      <option key={cal.id} value={cal.id} style={{ backgroundColor: "#111" }}>
                        {cal.primary ? "Primary" : cal.summary}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="text-xs text-white/40 uppercase tracking-wider block mb-1">Attendees (comma-separated emails)</label>
                <input
                  type="text"
                  value={newEventForm.attendees}
                  onChange={(e) => setNewEventForm((prev) => ({ ...prev, attendees: e.target.value }))}
                  placeholder="email@example.com, ..."
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-white/30 outline-none focus:border-sky-500/50"
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
                onClick={() => setShowNewEvent(false)}
                className="flex-1 px-4 py-2 rounded-xl text-sm text-white/60 hover:text-white bg-white/5 hover:bg-white/10 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateEvent}
                disabled={submitting || !newEventForm.summary.trim()}
                className="flex-1 px-4 py-2 rounded-xl text-sm text-white bg-sky-500 hover:bg-sky-400 disabled:opacity-50 transition-colors"
              >
                {submitting ? "Creating…" : "Create Event"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Event detail popover */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 sm:p-4" onClick={() => setSelectedEvent(null)}>
          <div className="bg-[#111] border border-white/10 rounded-t-2xl sm:rounded-2xl p-5 sm:p-6 w-full sm:max-w-sm max-h-[85dvh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3 mb-4">
              <div
                className="w-1.5 rounded-full mt-1 flex-shrink-0 self-stretch min-h-[2rem]"
                style={{ backgroundColor: selectedCalendar?.backgroundColor ?? "#38bdf8" }}
              />
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-semibold text-white leading-snug">{selectedEvent.summary}</h3>
                <p className="text-sm text-white/40 mt-1">
                  {selectedEvent.allDay
                    ? `All day · ${DateTime.fromISO(getEventDate(selectedEvent)).toFormat("MMMM d, yyyy")}`
                    : `${DateTime.fromISO(selectedEvent.start.dateTime ?? "").toFormat("MMMM d, yyyy · h:mm a")} – ${getEventEndTime(selectedEvent)}`}
                </p>
              </div>
              <button onClick={() => setSelectedEvent(null)} className="text-white/40 hover:text-white transition-colors flex-shrink-0">
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {selectedEvent.location && (
              <div className="flex items-start gap-2 mb-3">
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" className="text-white/30 flex-shrink-0 mt-0.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                </svg>
                <span className="text-sm text-white/50">{selectedEvent.location}</span>
              </div>
            )}

            {selectedEvent.description && (
              <p className="text-sm text-white/50 mb-3 leading-relaxed">{selectedEvent.description}</p>
            )}

            {selectedEvent.attendees && selectedEvent.attendees.length > 0 && (
              <div className="mb-3">
                <div className="text-xs text-white/30 uppercase tracking-wider mb-1">Attendees</div>
                <div className="space-y-1">
                  {selectedEvent.attendees.map((a) => (
                    <div key={a.email} className="text-sm text-white/50">{a.displayName ?? a.email}</div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2 mt-4">
              {selectedEvent.htmlLink && (
                <a
                  href={selectedEvent.htmlLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 text-center px-3 py-2 rounded-xl text-sm text-white/60 hover:text-white bg-white/5 hover:bg-white/10 transition-colors"
                >
                  Open in Calendar
                </a>
              )}
              <button
                onClick={() => handleDeleteEvent(selectedEvent)}
                className="px-3 py-2 rounded-xl text-sm text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

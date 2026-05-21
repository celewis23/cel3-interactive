"use client";

import { useMemo, useState } from "react";

type AppointmentResponseStatus = "accepted" | "declined" | "suggested_new_time";

type AppointmentResponse = {
  status: AppointmentResponseStatus;
  note: string | null;
  suggestedStart: string | null;
  suggestedEnd: string | null;
  respondedAt: string;
};

type Appointment = {
  id: string;
  calendarId: string;
  summary: string;
  description?: string;
  location?: string;
  start: string;
  end: string;
  allDay: boolean;
  htmlLink?: string;
  attendees?: { email: string; displayName?: string; responseStatus?: string }[];
  clientResponse: AppointmentResponse | null;
};

function formatDate(value: string, allDay = false) {
  if (!value) return "Date not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  if (allDay) {
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  }
  return date.toLocaleString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/New_York",
  });
}

function formatTime(value: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/New_York",
  });
}

function stripHtml(value = "") {
  return value.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "").trim();
}

function escapeIcs(value: string) {
  return value
    .replaceAll("\\", "\\\\")
    .replaceAll("\n", "\\n")
    .replaceAll(",", "\\,")
    .replaceAll(";", "\\;");
}

function toIcsDate(value: string, allDay: boolean) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  if (allDay) {
    return date.toISOString().slice(0, 10).replaceAll("-", "");
  }
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function buildCalendarDownloadUrl(appointment: Appointment) {
  const start = toIcsDate(appointment.start, appointment.allDay);
  const end = toIcsDate(appointment.end || appointment.start, appointment.allDay);
  if (!start) return null;
  const dateKey = appointment.allDay ? "VALUE=DATE:" : ":";
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//CEL3 Interactive//Client Portal//EN",
    "BEGIN:VEVENT",
    `UID:${escapeIcs(`${appointment.calendarId}-${appointment.id}@cel3interactive.com`)}`,
    `SUMMARY:${escapeIcs(appointment.summary || "Appointment")}`,
    `DTSTART${dateKey}${start}`,
    end ? `DTEND${dateKey}${end}` : "",
    appointment.location ? `LOCATION:${escapeIcs(appointment.location)}` : "",
    appointment.description ? `DESCRIPTION:${escapeIcs(stripHtml(appointment.description))}` : "",
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean).join("\r\n");
  return `data:text/calendar;charset=utf-8,${encodeURIComponent(ics)}`;
}

function responseLabel(response: AppointmentResponse | null) {
  if (!response) return "Awaiting your response";
  if (response.status === "accepted") return "You accepted";
  if (response.status === "declined") return "You declined";
  return "You suggested a new time";
}

export function PortalAppointmentsClient({ appointments }: { appointments: Appointment[] }) {
  const [items, setItems] = useState(appointments);
  const [selectedKey, setSelectedKey] = useState(
    appointments[0] ? `${appointments[0].calendarId}:${appointments[0].id}` : null
  );
  const [status, setStatus] = useState<AppointmentResponseStatus | "">("");
  const [note, setNote] = useState("");
  const [suggestedStart, setSuggestedStart] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const selected = useMemo(
    () => items.find((item) => `${item.calendarId}:${item.id}` === selectedKey) ?? items[0] ?? null,
    [items, selectedKey]
  );
  const calendarUrl = selected ? buildCalendarDownloadUrl(selected) : null;

  async function submitResponse(nextStatus: AppointmentResponseStatus) {
    if (!selected) return;
    if (nextStatus === "suggested_new_time" && !suggestedStart) {
      setMessage("Choose a suggested time before sending.");
      return;
    }
    setSubmitting(true);
    setMessage(null);
    try {
      const res = await fetch("/api/portal/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: selected.id,
          calendarId: selected.calendarId,
          status: nextStatus,
          note,
          suggestedStart: suggestedStart ? new Date(suggestedStart).toISOString() : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not save your response");
      setItems((prev) => prev.map((item) => item.id === selected.id && item.calendarId === selected.calendarId
        ? { ...item, clientResponse: data.response }
        : item
      ));
      setStatus("");
      setNote("");
      setSuggestedStart("");
      setMessage("Your response was sent.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not save your response");
    } finally {
      setSubmitting(false);
    }
  }

  if (items.length === 0) {
    return (
      <div className="bg-white/3 border border-white/8 rounded-2xl p-8 text-center">
        <p className="text-white/40 text-sm">No upcoming appointments in the next 30 days.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(260px,360px)_minmax(0,1fr)]">
      <div className="flex flex-col gap-3">
        {items.map((appointment) => {
          const appointmentKey = `${appointment.calendarId}:${appointment.id}`;
          const active = selectedKey === appointmentKey;
          return (
            <button
              key={appointmentKey}
              type="button"
              onClick={() => {
                setSelectedKey(appointmentKey);
                setStatus("");
                setNote("");
                setSuggestedStart("");
                setMessage(null);
              }}
              className={`text-left rounded-2xl px-5 py-4 border transition-colors ${
                active
                  ? "bg-sky-500/10 border-sky-400/30"
                  : "bg-white/3 border-white/8 hover:bg-white/5"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white truncate">{appointment.summary || "Untitled event"}</p>
                  <p className="text-xs text-white/40 mt-1">
                    {formatDate(appointment.start, appointment.allDay)}
                    {!appointment.allDay && appointment.end ? ` - ${formatTime(appointment.end)} ET` : appointment.allDay ? " · All day" : " ET"}
                  </p>
                </div>
                <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] ${
                  appointment.clientResponse?.status === "accepted"
                    ? "bg-green-500/10 text-green-300"
                    : appointment.clientResponse?.status === "declined"
                      ? "bg-red-500/10 text-red-300"
                      : appointment.clientResponse?.status === "suggested_new_time"
                        ? "bg-amber-500/10 text-amber-300"
                        : "bg-white/8 text-white/35"
                }`}>
                  {responseLabel(appointment.clientResponse)}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {selected && (
        <section className="rounded-3xl border border-white/8 bg-white/[0.035] overflow-hidden">
          <div className="p-6 border-b border-white/8">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-sky-300/75">Appointment Details</p>
                <h2 className="mt-2 text-xl font-semibold text-white">{selected.summary || "Untitled event"}</h2>
                <p className="mt-2 text-sm text-white/45">
                  {formatDate(selected.start, selected.allDay)}
                  {!selected.allDay && selected.end ? ` - ${formatTime(selected.end)} ET` : selected.allDay ? " · All day" : " ET"}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {calendarUrl && (
                  <a
                    href={calendarUrl}
                    download={`${(selected.summary || "appointment").replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.ics`}
                    className="rounded-xl bg-white/8 hover:bg-white/12 px-3 py-2 text-xs text-white/65 transition-colors"
                  >
                    Add to calendar
                  </a>
                )}
                {selected.htmlLink && (
                  <a
                    href={selected.htmlLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-xl bg-white/8 hover:bg-white/12 px-3 py-2 text-xs text-white/65 transition-colors"
                  >
                    Open calendar event
                  </a>
                )}
              </div>
            </div>
          </div>

          <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="p-6 space-y-5">
              {selected.location && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-white/28">Location</p>
                  <p className="mt-1 text-sm text-white/70 whitespace-pre-wrap">{selected.location}</p>
                </div>
              )}
              {selected.description && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-white/28">Notes</p>
                  <p className="mt-1 text-sm leading-relaxed text-white/65 whitespace-pre-wrap">{stripHtml(selected.description)}</p>
                </div>
              )}
              {selected.attendees && selected.attendees.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-white/28">Guests</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {selected.attendees.map((attendee) => (
                      <span key={attendee.email} className="rounded-full bg-white/6 px-3 py-1 text-xs text-white/45">
                        {attendee.displayName || attendee.email}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-white/8 p-6 lg:border-l lg:border-t-0">
              <p className="text-xs font-semibold uppercase tracking-widest text-white/28">Your Response</p>
              <p className="mt-2 text-sm text-white/60">{responseLabel(selected.clientResponse)}</p>
              {selected.clientResponse?.note && (
                <p className="mt-2 rounded-xl bg-white/5 p-3 text-xs leading-relaxed text-white/50">{selected.clientResponse.note}</p>
              )}

              <div className="mt-5 grid gap-2">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => submitResponse("accepted")}
                  className="rounded-xl bg-green-500/14 hover:bg-green-500/20 px-4 py-2.5 text-sm font-medium text-green-200 disabled:opacity-50"
                >
                  I&apos;m going
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => submitResponse("declined")}
                  className="rounded-xl bg-red-500/12 hover:bg-red-500/18 px-4 py-2.5 text-sm font-medium text-red-200 disabled:opacity-50"
                >
                  I can&apos;t make it
                </button>
                <button
                  type="button"
                  onClick={() => setStatus(status === "suggested_new_time" ? "" : "suggested_new_time")}
                  className="rounded-xl bg-amber-500/12 hover:bg-amber-500/18 px-4 py-2.5 text-sm font-medium text-amber-200"
                >
                  Suggest a new time
                </button>
              </div>

              {status === "suggested_new_time" && (
                <div className="mt-4 space-y-3">
                  <label className="block">
                    <span className="text-xs text-white/35">Suggested date and time</span>
                    <input
                      type="datetime-local"
                      value={suggestedStart}
                      onChange={(e) => setSuggestedStart(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/75 outline-none"
                    />
                  </label>
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => submitResponse("suggested_new_time")}
                    className="w-full rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-black disabled:opacity-50"
                  >
                    Send new time suggestion
                  </button>
                </div>
              )}

              <label className="mt-4 block">
                <span className="text-xs text-white/35">Optional note</span>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={4}
                  placeholder="Add context for CEL3..."
                  className="mt-1 w-full resize-none rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/75 outline-none placeholder:text-white/20"
                />
              </label>

              {message && (
                <p className="mt-3 rounded-xl bg-white/6 px-3 py-2 text-xs text-white/55">{message}</p>
              )}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

import { google } from "googleapis";
import { getAuthenticatedClient } from "@/lib/gmail/client";
import { DateTime } from "luxon";

export type CalendarEvent = {
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
  reminders?: {
    useDefault: boolean;
    overrides?: { method: "email" | "popup"; minutes: number }[];
  };
  allDay: boolean;
  calendarId: string;
};

export type GoogleCalendar = {
  id: string;
  summary: string;
  backgroundColor?: string;
  foregroundColor?: string;
  primary?: boolean;
  selected?: boolean;
};

function mapEvent(
  e: {
    id?: string | null;
    summary?: string | null;
    description?: string | null;
    location?: string | null;
    start?: { dateTime?: string | null; date?: string | null; timeZone?: string | null } | null;
    end?: { dateTime?: string | null; date?: string | null; timeZone?: string | null } | null;
    status?: string | null;
    htmlLink?: string | null;
    colorId?: string | null;
    attendees?: { email?: string | null; displayName?: string | null; responseStatus?: string | null }[] | null;
    reminders?: {
      useDefault?: boolean | null;
      overrides?: { method?: string | null; minutes?: number | null }[] | null;
    } | null;
  },
  calendarId: string
): CalendarEvent {
  const start = {
    dateTime: e.start?.dateTime ?? undefined,
    date: e.start?.date ?? undefined,
    timeZone: e.start?.timeZone ?? undefined,
  };
  const end = {
    dateTime: e.end?.dateTime ?? undefined,
    date: e.end?.date ?? undefined,
    timeZone: e.end?.timeZone ?? undefined,
  };
  return {
    id: e.id ?? "",
    summary: e.summary ?? "(No title)",
    description: e.description ?? undefined,
    location: e.location ?? undefined,
    start,
    end,
    status: e.status ?? "confirmed",
    htmlLink: e.htmlLink ?? undefined,
    colorId: e.colorId ?? undefined,
    attendees: e.attendees
      ? e.attendees.map((a) => ({
          email: a.email ?? "",
          displayName: a.displayName ?? undefined,
          responseStatus: a.responseStatus ?? undefined,
        }))
      : undefined,
    reminders: e.reminders
      ? {
          useDefault: e.reminders.useDefault ?? true,
          overrides: e.reminders.overrides
            ?.filter((override) => (override.method === "email" || override.method === "popup") && typeof override.minutes === "number")
            .map((override) => ({
              method: override.method as "email" | "popup",
              minutes: override.minutes as number,
            })),
        }
      : undefined,
    allDay: !e.start?.dateTime,
    calendarId,
  };
}

export async function listCalendars(): Promise<GoogleCalendar[]> {
  const auth = await getAuthenticatedClient();
  if (!auth) throw new Error("Not authenticated with Google");

  const calendar = google.calendar({ version: "v3", auth: auth.oauth2Client });
  const res = await calendar.calendarList.list();

  return (res.data.items ?? []).map((c) => ({
    id: c.id ?? "",
    summary: c.summary ?? "",
    backgroundColor: c.backgroundColor ?? undefined,
    foregroundColor: c.foregroundColor ?? undefined,
    primary: c.primary ?? undefined,
    selected: c.selected ?? undefined,
  }));
}

export async function listEvents(opts: {
  calendarId?: string;
  timeMin?: string;
  timeMax?: string;
  maxResults?: number;
  pageToken?: string;
  q?: string;
}): Promise<{ events: CalendarEvent[]; nextPageToken?: string }> {
  const auth = await getAuthenticatedClient();
  if (!auth) throw new Error("Not authenticated with Google");

  const calendar = google.calendar({ version: "v3", auth: auth.oauth2Client });
  const calendarId = opts.calendarId ?? "primary";

  const res = await calendar.events.list({
    calendarId,
    timeMin: opts.timeMin ?? new Date().toISOString(),
    timeMax: opts.timeMax,
    maxResults: opts.maxResults ?? 100,
    pageToken: opts.pageToken,
    q: opts.q,
    singleEvents: true,
    orderBy: "startTime",
  });

  return {
    events: (res.data.items ?? []).map((e) => mapEvent(e, calendarId)),
    nextPageToken: res.data.nextPageToken ?? undefined,
  };
}

export async function createEvent(
  calendarId: string,
  params: {
    summary: string;
    description?: string;
    location?: string;
    start: { dateTime?: string; date?: string; timeZone?: string };
    end: { dateTime?: string; date?: string; timeZone?: string };
    attendees?: { email: string }[];
    reminders?: {
      useDefault?: boolean;
      overrides?: { method: "email" | "popup"; minutes: number }[];
    };
  }
): Promise<CalendarEvent> {
  const auth = await getAuthenticatedClient();
  if (!auth) throw new Error("Not authenticated with Google");

  const normalizedStart = params.start.date
    ? { ...params.start }
    : {
        ...params.start,
        dateTime: params.start.dateTime
          ? DateTime.fromISO(params.start.dateTime).toUTC().toISO()
          : undefined,
      };
  const normalizedEnd = params.end.date
    ? {
        ...params.end,
        // Google Calendar all-day events use an exclusive end date.
        date:
          params.end.date && params.start.date && params.end.date === params.start.date
            ? DateTime.fromISO(params.end.date).plus({ days: 1 }).toISODate() ?? params.end.date
            : params.end.date,
      }
    : {
        ...params.end,
        dateTime: params.end.dateTime
          ? DateTime.fromISO(params.end.dateTime).toUTC().toISO()
          : undefined,
      };

  const calendar = google.calendar({ version: "v3", auth: auth.oauth2Client });
  const res = await calendar.events.insert({
    calendarId,
    requestBody: {
      ...params,
      start: normalizedStart,
      end: normalizedEnd,
      reminders: params.reminders,
    },
  });

  return mapEvent(res.data, calendarId);
}

export async function updateEvent(
  calendarId: string,
  eventId: string,
  params: Partial<{
    summary: string;
    description: string;
    location: string;
    start: { dateTime?: string; date?: string; timeZone?: string };
    end: { dateTime?: string; date?: string; timeZone?: string };
    reminders: {
      useDefault?: boolean;
      overrides?: { method: "email" | "popup"; minutes: number }[];
    };
  }>
): Promise<CalendarEvent> {
  const auth = await getAuthenticatedClient();
  if (!auth) throw new Error("Not authenticated with Google");

  const calendar = google.calendar({ version: "v3", auth: auth.oauth2Client });
  const res = await calendar.events.patch({
    calendarId,
    eventId,
    requestBody: params,
  });

  return mapEvent(res.data, calendarId);
}

export async function deleteEvent(
  calendarId: string,
  eventId: string
): Promise<void> {
  const auth = await getAuthenticatedClient();
  if (!auth) throw new Error("Not authenticated with Google");

  const calendar = google.calendar({ version: "v3", auth: auth.oauth2Client });
  await calendar.events.delete({ calendarId, eventId });
}

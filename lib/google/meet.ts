import { google } from "googleapis";
import { randomUUID } from "crypto";
import { getAuthenticatedClient } from "@/lib/gmail/client";

export type MeetMeeting = {
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

function mapMeeting(
  ev: {
    id?: string | null;
    summary?: string | null;
    description?: string | null;
    start?: { dateTime?: string | null; date?: string | null } | null;
    end?: { dateTime?: string | null; date?: string | null } | null;
    hangoutLink?: string | null;
    attendees?: { email?: string | null; displayName?: string | null; responseStatus?: string | null }[] | null;
    status?: string | null;
  },
  calendarId: string
): MeetMeeting {
  return {
    id: ev.id ?? "",
    calendarId,
    summary: ev.summary ?? "(No title)",
    description: ev.description ?? undefined,
    start: {
      dateTime: ev.start?.dateTime ?? undefined,
      date: ev.start?.date ?? undefined,
    },
    end: {
      dateTime: ev.end?.dateTime ?? undefined,
      date: ev.end?.date ?? undefined,
    },
    meetLink: ev.hangoutLink ?? "",
    attendees: ev.attendees
      ? ev.attendees.map((a) => ({
          email: a.email ?? "",
          displayName: a.displayName ?? undefined,
          responseStatus: a.responseStatus ?? undefined,
        }))
      : undefined,
    status: ev.status ?? "confirmed",
    allDay: !ev.start?.dateTime,
  };
}

export async function listUpcomingMeetings(opts?: {
  calendarId?: string;
  maxResults?: number;
  timeMin?: string;
}): Promise<MeetMeeting[]> {
  const auth = await getAuthenticatedClient();
  if (!auth) throw new Error("Not authenticated with Google");

  const calendar = google.calendar({ version: "v3", auth: auth.oauth2Client });
  const calendarId = opts?.calendarId ?? "primary";

  const res = await calendar.events.list({
    calendarId,
    timeMin: opts?.timeMin ?? new Date().toISOString(),
    maxResults: opts?.maxResults ?? 50,
    singleEvents: true,
    orderBy: "startTime",
  });

  const items = res.data.items ?? [];
  return items
    .filter((ev) => !!ev.hangoutLink)
    .map((ev) => mapMeeting(ev, calendarId));
}

export async function createMeeting(params: {
  summary: string;
  description?: string;
  startDateTime: string;
  endDateTime: string;
  attendeeEmails?: string[];
  calendarId?: string;
}): Promise<MeetMeeting> {
  const auth = await getAuthenticatedClient();
  if (!auth) throw new Error("Not authenticated with Google");

  const calendar = google.calendar({ version: "v3", auth: auth.oauth2Client });
  const calendarId = params.calendarId ?? "primary";

  const res = await calendar.events.insert({
    calendarId,
    conferenceDataVersion: 1,
    requestBody: {
      summary: params.summary,
      description: params.description,
      start: { dateTime: params.startDateTime },
      end: { dateTime: params.endDateTime },
      attendees: params.attendeeEmails?.map((email) => ({ email })),
      conferenceData: {
        createRequest: {
          requestId: randomUUID(),
          conferenceSolutionKey: { type: "hangoutsMeet" },
        },
      },
    },
  });

  return mapMeeting(res.data, calendarId);
}

export async function deleteMeeting(
  calendarId: string,
  eventId: string
): Promise<void> {
  const auth = await getAuthenticatedClient();
  if (!auth) throw new Error("Not authenticated with Google");

  const calendar = google.calendar({ version: "v3", auth: auth.oauth2Client });
  await calendar.events.delete({ calendarId, eventId });
}

import { listCalendars, listEvents, type CalendarEvent } from "@/lib/google/calendar";

function eventMatchesEmail(event: CalendarEvent, email: string) {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return false;

  if (event.attendees?.some((attendee) => attendee.email.toLowerCase() === normalized)) {
    return true;
  }

  const searchable = [event.summary, event.description, event.location].filter(Boolean).join(" ").toLowerCase();
  return searchable.includes(normalized);
}

export async function listPortalAppointments(email: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const timeMin = today.toISOString();
  const nextMonth = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  const calendars = await listCalendars().catch(() => []);
  const calendarIds = Array.from(new Set([
    "primary",
    ...calendars.map((calendar) => calendar.id).filter(Boolean),
  ]));

  const eventResults = await Promise.all(
    calendarIds.map((calendarId) =>
      listEvents({
        calendarId,
        timeMin,
        timeMax: nextMonth,
        maxResults: 100,
      }).catch(() => ({ events: [] as CalendarEvent[] }))
    )
  );

  const seen = new Set<string>();
  const events = eventResults
    .flatMap((result) => result.events)
    .filter((event) => {
      const key = `${event.calendarId}:${event.id}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

  return events.filter((event) => eventMatchesEmail(event, email));
}

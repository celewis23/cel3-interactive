import { listEvents, type CalendarEvent } from "@/lib/google/calendar";

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
  const now = new Date().toISOString();
  const nextMonth = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  const { events } = await listEvents({
    timeMin: now,
    timeMax: nextMonth,
    maxResults: 100,
  }).catch(() => ({ events: [] as CalendarEvent[] }));

  return events.filter((event) => eventMatchesEmail(event, email));
}

import { getPortalUser } from "@/lib/portal/getPortalUser";
import { listPortalAppointmentsWithResponses } from "@/lib/portal/appointments";
import { PortalAppointmentsClient } from "@/components/portal/PortalAppointmentsClient";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function PortalAppointmentsPage() {
  const user = await getPortalUser();

  const events = await listPortalAppointmentsWithResponses(user.email);
  const appointments = events.map((e) => ({
    id: e.id,
    calendarId: e.calendarId,
    summary: e.summary,
    description: e.description ?? "",
    location: e.location ?? "",
    start: e.start.dateTime ?? e.start.date ?? "",
    end: e.end.dateTime ?? e.end.date ?? "",
    allDay: e.allDay,
    htmlLink: e.htmlLink,
    attendees: e.attendees ?? [],
    clientResponse: e.clientResponse,
  }));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Appointments</h1>
        <p className="text-sm text-white/40 mt-1">Upcoming in the next 30 days</p>
      </div>

      <PortalAppointmentsClient appointments={appointments} />
    </div>
  );
}

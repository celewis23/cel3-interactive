import { getPortalUser } from "@/lib/portal/getPortalUser";
import { listPortalAppointments } from "@/lib/portal/appointments";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function PortalAppointmentsPage() {
  const user = await getPortalUser();

  const events = await listPortalAppointments(user.email);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Appointments</h1>
        <p className="text-sm text-white/40 mt-1">Upcoming in the next 30 days</p>
      </div>

      {events.length === 0 ? (
        <div className="bg-white/3 border border-white/8 rounded-2xl p-8 text-center">
          <p className="text-white/40 text-sm">No upcoming appointments in the next 30 days.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {events.map((e) => {
            const start = e.start.dateTime ?? e.start.date ?? "";
            const isDateTime = Boolean(e.start.dateTime);
            const date = start ? new Date(start) : null;
            return (
              <div
                key={e.id}
                className="bg-white/3 border border-white/8 rounded-2xl px-5 py-4 flex items-center justify-between gap-4"
              >
                <div>
                  <p className="text-sm font-medium text-white">{e.summary || "Untitled event"}</p>
                  {date && (
                    <p className="text-xs text-white/40 mt-0.5">
                      {date.toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "long",
                        day: "numeric",
                      })}
                      {isDateTime && !e.allDay
                        ? ` · ${date.toLocaleTimeString("en-US", {
                            hour: "numeric",
                            minute: "2-digit",
                            timeZone: "America/New_York",
                          })} ET`
                        : " · All day"}
                    </p>
                  )}
                </div>
                {e.htmlLink && (
                  <a
                    href={e.htmlLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-white/40 hover:text-white transition-colors flex-shrink-0"
                  >
                    View →
                  </a>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

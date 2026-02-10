import { sanityServer } from "@/lib/sanityServer";
import { DateTime } from "luxon";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TZ = "America/New_York";

type Booking = {
  _id: string;
  customerName: string;
  customerEmail: string;
  notes?: string;
  startsAtUtc: string;
  endsAtUtc: string;
  status: "CONFIRMED" | "CANCELED";
  stripeSessionId: string;
};

export default async function AdminBookingsPage({
  searchParams,
}: {
  searchParams: { key?: string };
}) {
  const key = searchParams?.key || "";
  const adminKey = process.env.ADMIN_VIEW_KEY || "";

  if (!adminKey || key !== adminKey) {
    return (
      <main className="min-h-screen bg-black px-6 py-12 text-white">
        <div className="mx-auto max-w-3xl rounded-2xl border border-gray-700 bg-gray-900 p-6">
          <h1 className="text-xl font-semibold">Unauthorized</h1>
          <p className="mt-2 text-gray-300">
            Missing or invalid key.
          </p>
        </div>
      </main>
    );
  }

  const nowUtc = DateTime.utc().toISO()!;

  const bookings = await sanityServer.fetch<Booking[]>(
    `*[
      _type=="assessmentBooking" &&
      status=="CONFIRMED" &&
      startsAtUtc >= $now
    ] | order(startsAtUtc asc)[0...200]{
      _id, customerName, customerEmail, notes, startsAtUtc, endsAtUtc, status, stripeSessionId
    }`,
    { now: nowUtc }
  );

  return (
    <main className="min-h-screen bg-black px-6 py-12 text-white">
      <div className="mx-auto max-w-5xl">
        <h1 className="text-2xl font-semibold">Upcoming Assessments</h1>
        <p className="mt-2 text-gray-300">
          Internal view. Share this URL with no one.
        </p>

        <div className="mt-6 rounded-2xl border border-gray-700 bg-gray-900">
          {bookings.length === 0 ? (
            <div className="p-6 text-gray-300">No upcoming bookings.</div>
          ) : (
            <ul className="divide-y divide-gray-800">
              {bookings.map((b) => {
                const startEt = DateTime.fromISO(b.startsAtUtc, { zone: "utc" }).setZone(TZ);
                const endEt = DateTime.fromISO(b.endsAtUtc, { zone: "utc" }).setZone(TZ);

                return (
                  <li key={b._id} className="p-6">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="text-lg font-semibold">
                          {b.customerName}
                        </div>
                        <div className="text-sm text-gray-300">
                          {b.customerEmail}
                        </div>
                        <div className="mt-2 text-sm text-gray-200">
                          <span className="font-semibold">Time:</span>{" "}
                          {startEt.toFormat("ccc, LLL d 'at' h:mm a")} – {endEt.toFormat("h:mm a")} ET
                        </div>
                        {b.notes ? (
                          <div className="mt-2 text-sm text-gray-300">
                            <span className="font-semibold text-gray-200">Notes:</span>{" "}
                            {b.notes}
                          </div>
                        ) : null}
                        <div className="mt-2 text-xs text-gray-500">
                          Booking ID: {b._id}
                        </div>
                      </div>

                      <form action="/api/admin/cancel-booking" method="POST" className="sm:text-right">
                        <input type="hidden" name="key" value={key} />
                        <input type="hidden" name="bookingId" value={b._id} />

                        <button
                          className="inline-flex items-center justify-center rounded-xl border border-gray-600 bg-black px-4 py-2 text-sm font-semibold text-white hover:border-gray-400"
                          type="submit"
                        >
                          Cancel
                        </button>
                      </form>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </main>
  );
}

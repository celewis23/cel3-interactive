"use client";

import { useEffect, useMemo, useState } from "react";
import { DateTime } from "luxon";

const TZ = "America/New_York";

type Slot = { startIso: string; endIso: string };

export default function BookingScheduler({
  sessionId,
  defaultEmail = "",
}: {
  sessionId: string;
  defaultEmail?: string;
}) {
  const [date, setDate] = useState(() => DateTime.now().setZone(TZ).toISODate()!);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(false);
  const [slotPicked, setSlotPicked] = useState<Slot | null>(null);

  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState(defaultEmail);
  const [notes, setNotes] = useState("");

  const [submitState, setSubmitState] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [error, setError] = useState("");

  const dateLabel = useMemo(() => {
    return DateTime.fromISO(date, { zone: TZ }).toFormat("cccc, LLL d");
  }, [date]);

  async function loadSlots(d: string) {
    setLoading(true);
    setError("");
    setSlots([]);
    setSlotPicked(null);

    try {
      const res = await fetch(`/api/availability?date=${encodeURIComponent(d)}`);
      const data = (await res.json()) as { ok: boolean; slots: Slot[] };
      setSlots(data.ok ? data.slots : []);
    } catch {
      setError("Could not load availability. Try again.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSlots(date);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  async function book() {
    if (!slotPicked) return;
    setSubmitState("submitting");
    setError("");

    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          customerName,
          customerEmail,
          notes,
          startIso: slotPicked.startIso,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || TZ,
        }),
      });

      const data = (await res.json()) as { ok: boolean; message?: string; bookingId?: string };

      if (!res.ok || !data.ok) {
        throw new Error(data.message || "Unable to confirm booking.");
      }

      setSubmitState("success");
    } catch (e: any) {
      setSubmitState("error");
      setError(e?.message || "Booking failed.");
    }
  }

  if (submitState === "success") {
    return (
      <div className="rounded-2xl border border-gray-700 bg-gray-900 p-6">
        <h3 className="text-xl font-semibold text-white">Booking confirmed ✅</h3>
        <p className="mt-2 text-gray-300">
          You’re all set. Check your email for confirmation.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-700 bg-gray-900 p-6 text-white">
      <h3 className="text-xl font-semibold">Choose a time</h3>
      <p className="mt-2 text-gray-300">
        Availability is shown in <span className="font-semibold">Eastern Time</span>.
      </p>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="text-sm text-gray-300">
          Date
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-gray-700 bg-black px-3 py-2 text-white"
          />
        </label>

        <div className="text-sm text-gray-300 sm:mt-6">{dateLabel}</div>
      </div>

      <div className="mt-6">
        {loading ? (
          <p className="text-gray-300">Loading available times…</p>
        ) : slots.length === 0 ? (
          <p className="text-gray-300">No available times for this date.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {slots.map((s) => {
              const t = DateTime.fromISO(s.startIso, { zone: TZ }).toFormat("h:mm a");
              const selected = slotPicked?.startIso === s.startIso;

              return (
                <button
                  key={s.startIso}
                  onClick={() => setSlotPicked(s)}
                  className={[
                    "rounded-xl border px-3 py-2 text-sm font-semibold",
                    selected
                      ? "border-white bg-white text-black"
                      : "border-gray-700 bg-black text-white hover:border-gray-500",
                  ].join(" ")}
                >
                  {t}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <hr className="my-8 border-gray-800" />

      <h3 className="text-xl font-semibold">Confirm details</h3>

      <div className="mt-4 grid gap-4">
        <label className="text-sm text-gray-300">
          Full name
          <input
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-gray-700 bg-black px-3 py-2 text-white"
            placeholder="Your name"
          />
        </label>

        <label className="text-sm text-gray-300">
          Email
          <input
            value={customerEmail}
            onChange={(e) => setCustomerEmail(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-gray-700 bg-black px-3 py-2 text-white"
            placeholder="you@business.com"
          />
        </label>

        <label className="text-sm text-gray-300">
          Notes (optional)
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="mt-1 block min-h-[90px] w-full rounded-lg border border-gray-700 bg-black px-3 py-2 text-white"
            placeholder="Anything we should know before the call?"
          />
        </label>

        {error ? <p className="text-sm text-red-400">{error}</p> : null}

        <button
          disabled={!slotPicked || customerName.trim().length < 2 || !customerEmail.includes("@") || submitState === "submitting"}
          onClick={book}
          className="mt-2 w-full rounded-xl bg-white px-4 py-2.5 font-semibold text-black disabled:opacity-50"
        >
          {submitState === "submitting" ? "Confirming…" : "Confirm Booking"}
        </button>

        <p className="text-xs text-gray-500">
          Booking is locked after payment and time confirmation.
        </p>
      </div>
    </div>
  );
}

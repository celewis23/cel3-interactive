import { NextResponse } from "next/server";
import { DateTime } from "luxon";
import { sanityServer } from "@/lib/sanityServer";

export const runtime = "nodejs";
const TZ = "America/New_York";
const SLOT_MINUTES = 45;
const BUFFER_MINUTES = 15;
const LEAD_HOURS = 12;

function isBusinessDay(dt: DateTime) {
  return dt.weekday >= 1 && dt.weekday <= 5; // Mon–Fri
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const dateStr = searchParams.get("date"); // YYYY-MM-DD in TZ
  if (!dateStr) {
    return NextResponse.json({ ok: false, message: "Missing date" }, { status: 400 });
  }

  const dayStart = DateTime.fromISO(dateStr, { zone: TZ }).startOf("day");
  if (!dayStart.isValid) {
    return NextResponse.json({ ok: false, message: "Invalid date" }, { status: 400 });
  }

  const nowTz = DateTime.now().setZone(TZ);
  const maxDay = nowTz.plus({ days: 14 }).startOf("day");

  if (dayStart < nowTz.startOf("day") || dayStart > maxDay || !isBusinessDay(dayStart)) {
    return NextResponse.json({ ok: true, slots: [] }, { status: 200 });
  }

  const open = dayStart.set({ hour: 10, minute: 0 });
  const close = dayStart.set({ hour: 18, minute: 0 });
  const leadCutoff = nowTz.plus({ hours: LEAD_HOURS });

  // Query Sanity bookings in UTC range
  const rangeStartUtcIso = open.toUTC().toISO()!;
  const rangeEndUtcIso = close.toUTC().toISO()!;

  const bookings = await sanityServer.fetch<
    Array<{ startsAtUtc: string; endsAtUtc: string; status: string }>
  >(
    `*[_type=="assessmentBooking" && status=="CONFIRMED" && startsAtUtc >= $start && startsAtUtc < $end]{
      startsAtUtc, endsAtUtc, status
    }`,
    { start: rangeStartUtcIso, end: rangeEndUtcIso }
  );

  const booked = bookings.map((b) => ({
    startMs: DateTime.fromISO(b.startsAtUtc, { zone: "utc" }).toMillis(),
    endMs: DateTime.fromISO(b.endsAtUtc, { zone: "utc" }).toMillis(),
  }));

  const slots: Array<{ startIso: string; endIso: string }> = [];
  let cursor = open;

  while (cursor.plus({ minutes: SLOT_MINUTES }) <= close) {
    const slotStart = cursor;
    const slotEnd = cursor.plus({ minutes: SLOT_MINUTES });

    if (slotStart < leadCutoff) {
      cursor = cursor.plus({ minutes: SLOT_MINUTES + BUFFER_MINUTES });
      continue;
    }

    const candStartMs = slotStart.toUTC().toMillis();
    const candEndMs = slotEnd.toUTC().toMillis();

    const overlaps = booked.some((b) => {
      const bStart = b.startMs - BUFFER_MINUTES * 60_000;
      const bEnd = b.endMs + BUFFER_MINUTES * 60_000;
      return candStartMs < bEnd && candEndMs > bStart;
    });

    if (!overlaps) {
      slots.push({ startIso: slotStart.toISO()!, endIso: slotEnd.toISO()! });
    }

    cursor = cursor.plus({ minutes: SLOT_MINUTES + BUFFER_MINUTES });
  }

  return NextResponse.json({ ok: true, slots }, { status: 200 });
}

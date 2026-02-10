import { NextResponse } from "next/server";
import { DateTime } from "luxon";
import { stripe } from "@/lib/stripe";
import { Resend } from "resend";
import { sanityServer } from "@/lib/sanityServer";

export const runtime = "nodejs";
const TZ = "America/New_York";
const SLOT_MINUTES = 45;

const resend = new Resend(process.env.RESEND_API_KEY);

function isEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Deterministic IDs = locking mechanism
function slotDocId(startsAtUtcIso: string) {
  // Sanity _id cannot contain ':' so we normalize
  const safe = startsAtUtcIso.replaceAll(":", "-");
  return `assessmentSlot_${safe}`;
}
function sessionDocId(sessionId: string) {
  return `assessmentSession_${sessionId}`;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const sessionId = String(body.sessionId || "").trim();
    const customerName = String(body.customerName || "").trim();
    const customerEmail = String(body.customerEmail || "").trim();
    const notes = String(body.notes || "").trim();
    const startIsoTz = String(body.startIso || "").trim();
    const timezone = String(body.timezone || TZ).trim() || TZ;

    if (!sessionId) return NextResponse.json({ ok: false, message: "Missing sessionId" }, { status: 400 });
    if (customerName.length < 2) return NextResponse.json({ ok: false, message: "Name required" }, { status: 400 });
    if (!isEmail(customerEmail)) return NextResponse.json({ ok: false, message: "Valid email required" }, { status: 400 });
    if (!startIsoTz) return NextResponse.json({ ok: false, message: "Missing start time" }, { status: 400 });

    // Verify Stripe paid
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.payment_status !== "paid") {
      return NextResponse.json({ ok: false, message: "Payment not confirmed." }, { status: 403 });
    }

    // Parse TZ start, compute end, store UTC ISO
    const startTz = DateTime.fromISO(startIsoTz, { zone: TZ });
    if (!startTz.isValid) return NextResponse.json({ ok: false, message: "Invalid time" }, { status: 400 });

    const endTz = startTz.plus({ minutes: SLOT_MINUTES });

    const startsAtUtcIso = startTz.toUTC().toISO()!;
    const endsAtUtcIso = endTz.toUTC().toISO()!;

    const bookingId = slotDocId(startsAtUtcIso);
    const sessionLockId = sessionDocId(sessionId);

    // If session already booked, return idempotently
    const existingSession = await sanityServer.getDocument<any>(sessionLockId);
    if (existingSession?.bookingId) {
      return NextResponse.json({ ok: true, bookingId: existingSession.bookingId }, { status: 200 });
    }

    // Attempt atomic reservation:
    // - Create slot booking doc with deterministic _id (locks the slot)
    // - Create session lock doc with deterministic _id (locks the session)
    // If either already exists, we detect and handle.
    const nowUtcIso = DateTime.utc().toISO()!;

    try {
      await sanityServer
        .transaction()
        .createIfNotExists({
          _id: bookingId,
          _type: "assessmentBooking",
          customerName,
          customerEmail,
          notes: notes || undefined,
          timezone,
          startsAtUtc: startsAtUtcIso,
          endsAtUtc: endsAtUtcIso,
          stripeSessionId: sessionId,
          status: "CONFIRMED",
        })
        .createIfNotExists({
          _id: sessionLockId,
          _type: "assessmentSession",
          stripeSessionId: sessionId,
          bookingId: bookingId,
          createdAtUtc: nowUtcIso,
        })
        .commit();
    } catch {
      // If transaction fails for any reason, fall through to conflict check
    }

    // Fetch booking after transaction
    const booked = await sanityServer.getDocument<any>(bookingId);

    if (!booked) {
      return NextResponse.json({ ok: false, message: "Booking failed. Try again." }, { status: 500 });
    }

    // If slot exists but belongs to a different session, it's already booked
    if (booked.stripeSessionId && booked.stripeSessionId !== sessionId) {
      return NextResponse.json(
        { ok: false, message: "That time was just booked. Please pick another slot." },
        { status: 409 }
      );
    }

    // If this is our booking, ensure session lock exists (idempotent safety)
    const lock = await sanityServer.getDocument<any>(sessionLockId);
    if (!lock) {
      // Create lock if missing
      await sanityServer.createIfNotExists({
        _id: sessionLockId,
        _type: "assessmentSession",
        stripeSessionId: sessionId,
        bookingId: bookingId,
        createdAtUtc: nowUtcIso,
      });
    }

    // Emails
    const toEmail = process.env.ASSESSMENT_TO_EMAIL || "info@cel3interactive.com";
    const fromEmail = process.env.RESEND_FROM_EMAIL || "CEL3 Interactive <noreply@cel3interactive.com>";

    const displayStart = startTz.toFormat("ccc, LLL d 'at' h:mm a");
    const displayEnd = endTz.toFormat("h:mm a");

    await resend.emails.send({
      from: fromEmail,
      to: [toEmail],
      replyTo: customerEmail,
      subject: `Assessment Booked: ${customerName} (${displayStart} ET)`,
      html: `
        <div style="font-family: ui-sans-serif, system-ui; line-height: 1.4">
          <h2>Digital Systems Assessment Booked</h2>
          <p><strong>Name:</strong> ${escapeHtml(customerName)}</p>
          <p><strong>Email:</strong> ${escapeHtml(customerEmail)}</p>
          <p><strong>Time:</strong> ${escapeHtml(displayStart)}–${escapeHtml(displayEnd)} ET</p>
          ${notes ? `<p><strong>Notes:</strong><br/>${escapeHtml(notes).replaceAll("\n","<br/>")}</p>` : ""}
          <p><strong>Booking ID:</strong> ${bookingId}</p>
          <p style="color:#64748b; font-size: 12px;">Paid via Stripe session ${sessionId}</p>
        </div>
      `,
    });

    await resend.emails.send({
      from: fromEmail,
      to: [customerEmail],
      subject: "Your Digital Systems Assessment is Confirmed",
      html: `
        <div style="font-family: ui-sans-serif, system-ui; line-height: 1.4">
          <h2>Confirmed ✅</h2>
          <p>Thanks ${escapeHtml(customerName)}. Your Digital Systems Assessment is scheduled.</p>
          <p><strong>When:</strong> ${escapeHtml(displayStart)}–${escapeHtml(displayEnd)} ET</p>
          <p><strong>Where:</strong> We’ll email you the meeting link shortly.</p>
          <p style="margin-top:16px; font-size: 12px; color:#64748b;">
            CEL3 Interactive
          </p>
        </div>
      `,
    });

    return NextResponse.json({ ok: true, bookingId }, { status: 200 });
  } catch (err: any){
    console.error("BOOKING_ERROR:", err);
    return NextResponse.json({ ok: false, message: err?.message || "Booking failed. Please try again." }, { status: 500 });
  }
}

function escapeHtml(input: string) {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

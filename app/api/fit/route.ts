import { NextResponse } from "next/server";
import { sanityWriteClient } from "@/lib/sanity.write";
import { Resend } from "resend";

type FitPayload = {
  name: string;
  email: string;
  company?: string;
  website?: string;
  budget: string;
  timeline: string;
  services: string[];
  message: string;
  honey?: string; // bot trap
};

function isEmail(s: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

function escapeHtml(input: string) {
  return String(input ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function safeText(input: string, max = 2000) {
  const s = String(input ?? "").trim();
  return s.length > max ? s.slice(0, max) + "…" : s;
}

function getFromAddress() {
  // Verified sender recommended, e.g.:
  // "CEL3 Interactive <fit@cel3interactive.com>"
  // For testing you can use: "onboarding@resend.dev"
  return (
    process.env.FIT_FROM_EMAIL?.trim() ||
    "CEL3 Interactive <no-reply@cel3interactive.com>"
  );
}

function getTeamInbox() {
  // Where YOU receive the notification (your Gmail)
  return process.env.FIT_TO_EMAIL?.trim() || "";
}

function getReplyInbox() {
  // Where leads should reply to (could be same as FIT_TO_EMAIL)
  // Example: "hello@cel3interactive.com" or your Gmail
  return process.env.FIT_REPLY_TO_EMAIL?.trim() || getTeamInbox();
}

function getStudioLink(docId: string) {
  const base =
    process.env.SANITY_STUDIO_URL?.trim() || "https://studio.cel3interactive.com";
  return `${base}/desk/fitRequest;${docId}`;
}

function getSiteUrl(req: Request) {
  // Prefer explicit site URL if provided
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");

  // Fallback to request origin
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") || "https";
  if (!host) return "https://www.cel3interactive.com";
  return `${proto}://${host}`.replace(/\/$/, "");
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as FitPayload;

    // Honeypot: if filled, silently accept but do nothing
    if (body.honey && body.honey.trim().length > 0) {
      return NextResponse.json({ ok: true });
    }

    // Basic validation
    if (!body.name?.trim()) {
      return NextResponse.json(
        { ok: false, error: "Name is required" },
        { status: 400 }
      );
    }

    if (!body.email?.trim() || !isEmail(body.email)) {
      return NextResponse.json(
        { ok: false, error: "Valid email is required" },
        { status: 400 }
      );
    }

    if (!body.budget?.trim()) {
      return NextResponse.json(
        { ok: false, error: "Budget is required" },
        { status: 400 }
      );
    }

    if (!body.timeline?.trim()) {
      return NextResponse.json(
        { ok: false, error: "Timeline is required" },
        { status: 400 }
      );
    }

    if (!Array.isArray(body.services) || body.services.length < 1) {
      return NextResponse.json(
        { ok: false, error: "Choose at least 1 service" },
        { status: 400 }
      );
    }

    if (!body.message?.trim() || body.message.trim().length < 10) {
      return NextResponse.json(
        { ok: false, error: "Message must be at least 10 characters" },
        { status: 400 }
      );
    }

    // Create Sanity document
    const doc = {
      _type: "fitRequest",
      name: body.name.trim(),
      email: body.email.trim(),
      company: body.company?.trim() || undefined,
      website: body.website?.trim() || undefined,
      budget: body.budget,
      timeline: body.timeline,
      services: body.services,
      message: body.message.trim(),
      source: "website",
      status: "new",
      createdAt: new Date().toISOString(),
    };

    const created = await sanityWriteClient.create(doc);
    const studioLink = getStudioLink(created._id);

    // Email (notifications + auto-ack)
    const RESEND_API_KEY = process.env.RESEND_API_KEY?.trim();
    const TO_TEAM = getTeamInbox();
    const REPLY_INBOX = getReplyInbox();
    const FROM = getFromAddress();
    const SITE_URL = getSiteUrl(req);

    if (RESEND_API_KEY && TO_TEAM) {
      const resend = new Resend(RESEND_API_KEY);

      // ---------------------------
      // (1) Team notification email
      // ---------------------------
      const teamSubject = `New Fit Request: ${safeText(body.name, 80)} • ${safeText(
        body.budget,
        40
      )}`;

      const teamText = `
New Fit Request

Name: ${body.name}
Email: ${body.email}
Company: ${body.company || "—"}
Website: ${body.website || "—"}
Budget: ${body.budget}
Timeline: ${body.timeline}
Services: ${body.services.join(", ")}

Message:
${body.message}

Sanity ID: ${created._id}
Open in Studio: ${studioLink}

Tip: Hit Reply in Gmail. This email sets Reply-To to the lead.
      `.trim();

      const teamHtml = `
        <div style="font-family: ui-sans-serif, system-ui; line-height: 1.55; color: #0b0b0b;">
          <h2 style="margin:0 0 10px 0;">New Fit Request</h2>

          <div style="margin: 0 0 12px 0;">
            <a href="mailto:${escapeHtml(body.email.trim())}"
               style="display:inline-block; padding:10px 14px; border-radius:999px; border:1px solid #111; text-decoration:none; color:#111; font-weight:600;">
              Reply to ${escapeHtml(body.name.trim())} →
            </a>
            <span style="margin-left:10px; font-size:12px; opacity:.75;">
              (Reply-To is set, so Gmail Reply should work too.)
            </span>
          </div>

          <table style="border-collapse: collapse; width: 100%; max-width: 680px;">
            <tr><td style="padding:6px 0; opacity:.7; width:130px;"><b>Name</b></td><td style="padding:6px 0;">${escapeHtml(body.name)}</td></tr>
            <tr><td style="padding:6px 0; opacity:.7;"><b>Email</b></td><td style="padding:6px 0;">${escapeHtml(body.email)}</td></tr>
            <tr><td style="padding:6px 0; opacity:.7;"><b>Company</b></td><td style="padding:6px 0;">${escapeHtml(body.company || "—")}</td></tr>
            <tr><td style="padding:6px 0; opacity:.7;"><b>Website</b></td><td style="padding:6px 0;">${escapeHtml(body.website || "—")}</td></tr>
            <tr><td style="padding:6px 0; opacity:.7;"><b>Budget</b></td><td style="padding:6px 0;">${escapeHtml(body.budget)}</td></tr>
            <tr><td style="padding:6px 0; opacity:.7;"><b>Timeline</b></td><td style="padding:6px 0;">${escapeHtml(body.timeline)}</td></tr>
            <tr><td style="padding:6px 0; opacity:.7;"><b>Services</b></td><td style="padding:6px 0;">${body.services
              .map(escapeHtml)
              .join(", ")}</td></tr>
          </table>

          <hr style="margin:16px 0; border:none; border-top:1px solid #e5e5e5;" />

          <div style="opacity:.8; font-size: 12px; letter-spacing: .08em; text-transform: uppercase;">Message</div>
          <pre style="white-space: pre-wrap; background:#0b0b0b; color:#f6f6f6; padding:12px; border-radius:12px; margin-top:10px;">${escapeHtml(
            safeText(body.message, 6000)
          )}</pre>

          <div style="margin-top:12px; font-size: 12px; opacity: .75;">
            <div>Sanity ID: <code>${escapeHtml(created._id)}</code></div>
            <div style="margin-top:6px;">
              <a href="${studioLink}" style="color:#111; text-decoration:underline;">
                Open in Sanity Studio →
              </a>
            </div>
          </div>
        </div>
      `;

      // ---------------------------
      // (2) Lead auto-ACK email
      // ---------------------------
      const leadSubject = `Received: your Fit request to CEL3 Interactive`;

      const leadText = `
Hey ${body.name},

Got it. Thanks for sending your Fit request.

What happens next:
- I review your scope + budget
- I reply with next steps + a build plan
- If it’s a match, we schedule a quick call

If you want to add anything, just reply to this email.

CEL3 Interactive
${SITE_URL}
      `.trim();

      const leadHtml = `
        <div style="font-family: ui-sans-serif, system-ui; line-height: 1.6; color: #0b0b0b;">
          <h2 style="margin:0 0 8px 0;">Received ✅</h2>
          <p style="margin:0 0 10px 0;">
            Hey ${escapeHtml(body.name.trim())},
          </p>
          <p style="margin:0 0 14px 0;">
            Got it. Thanks for sending your Fit request. I’ll review your scope + budget and reply with next steps and a build plan.
          </p>

          <div style="border:1px solid #e7e7e7; border-radius:14px; padding:14px; background:#fafafa;">
            <div style="font-size:12px; letter-spacing:.08em; text-transform:uppercase; opacity:.75;">
              What happens next
            </div>
            <ul style="margin:10px 0 0 18px; padding:0;">
              <li style="margin:6px 0;">I review your scope + budget.</li>
              <li style="margin:6px 0;">You get a reply with direction + timeline.</li>
              <li style="margin:6px 0;">If it’s a match, we schedule a call.</li>
            </ul>
          </div>

          <p style="margin:14px 0 0 0; opacity:.85;">
            Want to add more context? Just reply to this email.
          </p>

          <div style="margin-top:14px; font-size:12px; opacity:.7;">
            CEL3 Interactive • <a href="${SITE_URL}" style="color:#111; text-decoration:underline;">${SITE_URL}</a>
          </div>
        </div>
      `;

      try {
        // 1) Send team notification (Reply-To lead)
        await resend.emails.send({
          from: FROM,
          to: [TO_TEAM],
          replyTo: body.email.trim(), // ✅ your "Reply" goes to the lead
          subject: teamSubject,
          text: teamText,
          html: teamHtml,
          headers: {
            "X-Entity-Ref-ID": created._id,
          },
        });

        // 2) Send lead confirmation (Reply-To your inbox)
        await resend.emails.send({
          from: FROM,
          to: [body.email.trim()],
          replyTo: REPLY_INBOX, // ✅ lead replies come to you
          subject: leadSubject,
          text: leadText,
          html: leadHtml,
          headers: {
            "X-Entity-Ref-ID": created._id,
          },
        });
      } catch (emailErr: any) {
        // Don’t fail the request if email sending fails
        console.error("Fit email send error:", emailErr?.message || emailErr);
      }
    } else {
      if (!RESEND_API_KEY)
        console.warn("RESEND_API_KEY missing: Fit email not sent.");
      if (!TO_TEAM) console.warn("FIT_TO_EMAIL missing: Fit email not sent.");
    }

    return NextResponse.json({ ok: true, id: created._id });
  } catch (err: any) {
    console.error("Fit route error:", err?.message || err);
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}

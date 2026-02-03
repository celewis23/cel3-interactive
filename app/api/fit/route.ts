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
  // simple bot trap:
  honey?: string;
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
  // If you haven't verified your domain in Resend yet, you can temporarily use:
  // "onboarding@resend.dev" (works for testing).
  // Once verified, switch to something like "CEL3 Interactive <no-reply@cel3interactive.com>"
  return process.env.FIT_FROM_EMAIL?.trim() || "onboarding@resend.dev";
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
      return NextResponse.json({ ok: false, error: "Name is required" }, { status: 400 });
    }
    if (!body.email?.trim() || !isEmail(body.email)) {
      return NextResponse.json({ ok: false, error: "Valid email is required" }, { status: 400 });
    }
    if (!body.budget?.trim()) {
      return NextResponse.json({ ok: false, error: "Budget is required" }, { status: 400 });
    }
    if (!body.timeline?.trim()) {
      return NextResponse.json({ ok: false, error: "Timeline is required" }, { status: 400 });
    }
    if (!Array.isArray(body.services) || body.services.length < 1) {
      return NextResponse.json({ ok: false, error: "Choose at least 1 service" }, { status: 400 });
    }
    if (!body.message?.trim() || body.message.trim().length < 10) {
      return NextResponse.json({ ok: false, error: "Message must be at least 10 characters" }, { status: 400 });
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
      createdAt: new Date().toISOString(),
    };

    const created = await sanityWriteClient.create(doc);

    // Send email (optional but recommended)
    const RESEND_API_KEY = process.env.RESEND_API_KEY?.trim();
    const TO = process.env.FIT_TO_EMAIL?.trim();

    if (RESEND_API_KEY && TO) {
      const resend = new Resend(RESEND_API_KEY);

      const subject = `New Fit Request: ${safeText(body.name, 80)} • ${safeText(body.budget, 40)}`;

      const html = `
        <div style="font-family: ui-sans-serif, system-ui; line-height: 1.55; color: #0b0b0b;">
          <h2 style="margin:0 0 10px 0;">New Fit Request</h2>

          <table style="border-collapse: collapse; width: 100%; max-width: 680px;">
            <tr><td style="padding:6px 0; opacity:.7; width:130px;"><b>Name</b></td><td style="padding:6px 0;">${escapeHtml(body.name)}</td></tr>
            <tr><td style="padding:6px 0; opacity:.7;"><b>Email</b></td><td style="padding:6px 0;">${escapeHtml(body.email)}</td></tr>
            <tr><td style="padding:6px 0; opacity:.7;"><b>Company</b></td><td style="padding:6px 0;">${escapeHtml(body.company || "")}</td></tr>
            <tr><td style="padding:6px 0; opacity:.7;"><b>Website</b></td><td style="padding:6px 0;">${escapeHtml(body.website || "")}</td></tr>
            <tr><td style="padding:6px 0; opacity:.7;"><b>Budget</b></td><td style="padding:6px 0;">${escapeHtml(body.budget)}</td></tr>
            <tr><td style="padding:6px 0; opacity:.7;"><b>Timeline</b></td><td style="padding:6px 0;">${escapeHtml(body.timeline)}</td></tr>
            <tr><td style="padding:6px 0; opacity:.7;"><b>Services</b></td><td style="padding:6px 0;">${body.services.map(escapeHtml).join(", ")}</td></tr>
          </table>

          <hr style="margin:16px 0; border:none; border-top:1px solid #e5e5e5;" />

          <div style="opacity:.8; font-size: 12px; letter-spacing: .08em; text-transform: uppercase;">Message</div>
          <pre style="white-space: pre-wrap; background:#0b0b0b; color:#f6f6f6; padding:12px; border-radius:12px; margin-top:10px;">${escapeHtml(
            safeText(body.message, 6000)
          )}</pre>

          <div style="margin-top:12px; font-size: 12px; opacity: .7;">
            Sanity ID: <code>${escapeHtml(created._id)}</code>
          </div>
        </div>
      `;

      try {
        await resend.emails.send({
          from: getFromAddress(),
          to: [TO],
          replyTo: body.email.trim(),
          subject,
          html,
        });
      } catch (emailErr: any) {
        // Don’t fail the whole request if email sending fails
        console.error("Fit email send error:", emailErr?.message || emailErr);
      }
    } else {
      // Helpful log if env vars are missing
      if (!RESEND_API_KEY) console.warn("RESEND_API_KEY missing: Fit email not sent.");
      if (!TO) console.warn("FIT_TO_EMAIL missing: Fit email not sent.");
    }

    return NextResponse.json({ ok: true, id: created._id });
  } catch (err: any) {
    console.error("Fit route error:", err?.message || err);
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}

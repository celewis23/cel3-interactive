// app/api/assessment/route.ts
import { NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const fullName = String(body.fullName || "").trim();
    const email = String(body.email || "").trim();
    const company = String(body.company || "").trim();
    const website = String(body.website || "").trim();
    const goal = String(body.goal || "").trim();

    if (fullName.length < 2) {
      return NextResponse.json({ ok: false, message: "Name is required." }, { status: 400 });
    }
    if (!isValidEmail(email)) {
      return NextResponse.json({ ok: false, message: "Valid email is required." }, { status: 400 });
    }
    if (goal.length < 10) {
      return NextResponse.json(
        { ok: false, message: "Please add a bit more detail about what you want to improve." },
        { status: 400 }
      );
    }

    const toEmail = process.env.ASSESSMENT_TO_EMAIL || "info@cel3interactive.com";

    // IMPORTANT:
    // Your "from" must be a domain verified in Resend.
    // Example: "CEL3 Interactive <noreply@cel3interactive.com>"
    const fromEmail =
      process.env.RESEND_FROM_EMAIL || "CEL3 Interactive <noreply@cel3interactive.com>";

    const subject = `New Assessment Booking Request: ${fullName}`;

    const html = `
      <div style="font-family: ui-sans-serif, system-ui; line-height: 1.4">
        <h2>New Digital Systems Assessment Request</h2>
        <p><strong>Name:</strong> ${escapeHtml(fullName)}</p>
        <p><strong>Email:</strong> ${escapeHtml(email)}</p>
        ${company ? `<p><strong>Company:</strong> ${escapeHtml(company)}</p>` : ""}
        ${website ? `<p><strong>Website:</strong> ${escapeHtml(website)}</p>` : ""}
        <p><strong>Goal:</strong></p>
        <p style="white-space: pre-wrap">${escapeHtml(goal)}</p>
        <hr />
        <p style="color:#64748b; font-size: 12px;">
          Sent from /assessment form on cel3interactive.com
        </p>
      </div>
    `;

    await resend.emails.send({
      from: fromEmail,
      to: [toEmail],
      replyTo: email,
      subject,
      html,
    });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, message: "Server error. Please try again." },
      { status: 500 }
    );
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

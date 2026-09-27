import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { logAudit } from "@/lib/audit/log";
import { withActivity } from "@/lib/audit/withActivity";

export const runtime = "nodejs";

const recipient = "info@cel3interactive.com";
const reviewUrl = "https://www.cel3interactive.com/mockups/electric-sun-society/";
const choices = { A: "The Headliner", B: "Hillside Press", C: "Sound System" } as const;
// Best-effort per-instance throttle for this public feedback endpoint.
const attempts = new Map<string, { count: number; expires: number }>();
const windowMs = 10 * 60 * 1000;

async function handlePOST(req: NextRequest) {
  const origin = req.headers.get("origin");
  if (!origin || ![new URL(req.url).origin, "https://www.cel3interactive.com", "https://cel3interactive.com"].includes(origin)) {
    return NextResponse.json({ error: "Please send your choice from the mockups page." }, { status: 403 });
  }
  if (req.headers.get("content-type")?.split(";")[0].trim() !== "application/json") {
    return NextResponse.json({ error: "Expected a JSON submission." }, { status: 415 });
  }
  const maxBytes = 32768;
  if (Number(req.headers.get("content-length")) > maxBytes) {
    return NextResponse.json({ error: "Your notes are too long." }, { status: 413 });
  }
  let body: unknown;
  try {
    const raw = await req.text();
    if (Buffer.byteLength(raw, "utf8") > maxBytes) {
      return NextResponse.json({ error: "Your notes are too long." }, { status: 413 });
    }
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Please try sending your choice again." }, { status: 400 });
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Invalid submission." }, { status: 400 });
  }
  const { choice, notes = "", requestId } = body as Record<string, unknown>;
  if (typeof choice !== "string" || !Object.hasOwn(choices, choice)) {
    return NextResponse.json({ error: "Please choose option A, B or C." }, { status: 400 });
  }
  if (typeof notes !== "string" || notes.length > 4000) {
    return NextResponse.json({ error: "Please keep your notes under 4,000 characters." }, { status: 400 });
  }
  if (typeof requestId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestId)) {
    return NextResponse.json({ error: "Please reload the page and try again." }, { status: 400 });
  }
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Email is temporarily unavailable. Please try again later or email info@cel3interactive.com." }, { status: 503 });
  }
  const now = Date.now();
  for (const [ip, entry] of attempts) if (entry.expires <= now) attempts.delete(ip);
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || req.headers.get("x-real-ip") || "unknown";
  const entry = attempts.get(ip) ?? { count: 0, expires: now + windowMs };
  if (entry.count >= 5 || (!attempts.has(ip) && attempts.size >= 1000)) {
    return NextResponse.json({ error: "Please wait a few minutes before sending another choice." }, {
      status: 429, headers: { "Retry-After": String(Math.ceil((entry.expires - now) / 1000)) },
    });
  }
  entry.count++;
  attempts.set(ip, entry);

  const direction = `${choice} — ${choices[choice as keyof typeof choices]}`;
  try {
    const { data, error } = await new Resend(apiKey).emails.send({
      from: process.env.RESEND_FROM_EMAIL || "CEL3 Interactive <noreply@cel3interactive.com>",
      to: [recipient],
      subject: `Electric Sun Society: design choice ${direction}`,
      text: `Electric Sun Society — Design feedback\n\nSelected direction: ${direction}\n\nNotes for CEL3:\n${notes.trim() || "No notes provided."}\n\nReview the options: ${reviewUrl}`,
    }, { idempotencyKey: `electric-sun-society-choice/${requestId}` });
    if (error || !data?.id) throw new Error("Email provider did not accept the submission.");
    logAudit(req, {
      action: "mockup.choice_sent", resourceType: "mockup", resourceId: "electric-sun-society",
      resourceLabel: "Electric Sun Society",
      description: `Electric Sun Society choice ${direction} emailed to ${recipient}.`,
      metadata: { choice, recipient, emailId: data.id },
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "We couldn't confirm your email was sent. Your choice and notes are still here; please try again or email info@cel3interactive.com." }, { status: 502 });
  }
}

export const POST = withActivity("/api/mockups/electric-sun-society/choice", "POST", handlePOST);

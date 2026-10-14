import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/postgres";
import { getMockupBySlug, createChoice } from "@/lib/mockups/db";
import { logAudit } from "@/lib/audit/log";
import { withActivity } from "@/lib/audit/withActivity";
import { sanityWriteClient } from "@/lib/sanity.write";
import { sendPushNotificationToAudience } from "@/lib/notifications/push";

export const runtime = "nodejs";
const maxBytes = 8192;

/** Best-effort: drop a pipeline lead so the submission shows up in the regular sales pipeline too. */
async function createPipelineContact(input: {
  mockupName: string;
  concept: string;
  contactName: string;
  contactEmail: string | null;
  contactPhone: string | null;
  notes: string | null;
}): Promise<string | null> {
  try {
    const now = new Date().toISOString();
    const contact = await sanityWriteClient.create({
      _type: "pipelineContact",
      name: input.contactName,
      email: input.contactEmail,
      phone: input.contactPhone,
      company: null,
      source: `Mockup: ${input.mockupName} (${input.concept})`,
      notes: input.notes,
      owner: null,
      stage: "new-lead",
      stageEnteredAt: now,
      estimatedValue: null,
      stripeCustomerId: null,
      googleContactResourceName: null,
      closedAt: null,
      driveFileUrl: null,
      driveFileName: null,
      followUpEventId: null,
      siteUrl: null,
      managementUrl: null,
      managementUsername: null,
      managementPasswordEncrypted: null,
      managementPasswordIv: null,
      portalSiteUrl: null,
      portalManagementUrl: null,
      portalManagementUsername: null,
      portalManagementPasswordEncrypted: null,
      portalManagementPasswordIv: null,
    });
    await sanityWriteClient.create({
      _type: "pipelineActivity",
      contactId: contact._id,
      type: "created",
      text: `Contact created from ${input.mockupName} mockup choice (${input.concept})`,
      fromStage: null,
      toStage: contact.stage,
      author: "Mockup",
    });
    sendPushNotificationToAudience(
      {
        title: "New mockup choice",
        body: `${input.contactName} picked ${input.concept} on ${input.mockupName}`,
        href: `/admin/pipeline/contacts/${contact._id}`,
        tag: `mockup-choice:${contact._id}`,
      },
      { module: "mockups", action: "view" }
    ).catch(() => {});
    return contact._id as string;
  } catch (err) {
    console.error("MOCKUP_CHOICE_PIPELINE_CREATE_ERR:", err);
    return null;
  }
}

async function handlePOST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!/^[a-z0-9-]{1,80}$/.test(slug)) {
    return NextResponse.json({ error: "Unknown mockup." }, { status: 404 });
  }

  const origin = req.headers.get("origin");
  const requestOrigin = `${req.nextUrl.protocol}//${req.headers.get("host") || req.nextUrl.host}`;
  if (origin && origin !== requestOrigin) {
    return NextResponse.json({ error: "Please send your choice from the mockup page." }, { status: 403 });
  }
  if (req.headers.get("content-type")?.split(";")[0].trim() !== "application/json") {
    return NextResponse.json({ error: "Expected a JSON submission." }, { status: 415 });
  }
  if (Number(req.headers.get("content-length")) > maxBytes) {
    return NextResponse.json({ error: "That submission is too long." }, { status: 413 });
  }

  let body: unknown;
  try {
    const raw = await req.text();
    if (Buffer.byteLength(raw, "utf8") > maxBytes) {
      return NextResponse.json({ error: "That submission is too long." }, { status: 413 });
    }
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Please try sending that again." }, { status: 400 });
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Invalid submission." }, { status: 400 });
  }

  const { concept, name, email, phone, notes, requestId } = body as Record<string, unknown>;
  if (typeof concept !== "string" || !concept.trim() || concept.length > 120) {
    return NextResponse.json({ error: "Please choose a design direction." }, { status: 400 });
  }
  if (typeof name !== "string" || !name.trim() || name.length > 200) {
    return NextResponse.json({ error: "Please enter your name." }, { status: 400 });
  }
  if (email !== undefined && email !== "" && (typeof email !== "string" || email.length > 320 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
    return NextResponse.json({ error: "Please enter a valid email." }, { status: 400 });
  }
  if (phone !== undefined && phone !== "" && (typeof phone !== "string" || phone.length > 40)) {
    return NextResponse.json({ error: "Please enter a valid phone number." }, { status: 400 });
  }
  if (notes !== undefined && notes !== "" && (typeof notes !== "string" || notes.length > 4000)) {
    return NextResponse.json({ error: "Please keep your notes under 4,000 characters." }, { status: 400 });
  }
  if (!email && !phone) {
    return NextResponse.json({ error: "Please leave an email or phone number so we can follow up." }, { status: 400 });
  }
  if (typeof requestId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestId)) {
    return NextResponse.json({ error: "Please reload the page and try again." }, { status: 400 });
  }

  try {
    const mockup = await getMockupBySlug(slug);
    if (!mockup) {
      return NextResponse.json({ error: "Unknown mockup." }, { status: 404 });
    }

    const address = (req.headers.get("x-vercel-forwarded-for") || req.headers.get("x-forwarded-for") || "unknown").split(",")[0].trim().slice(0, 100);
    const bucket = createHash("sha256").update(`mockup-choice:${slug}:${address}`).digest("hex");
    await sql.query(`DELETE FROM mockup_choice_attempts WHERE bucket IN
      (SELECT bucket FROM mockup_choice_attempts WHERE window_start < now() - interval '1 day' LIMIT 100)`);
    const limitRows = await sql.query<{ attempts: number }>(
      `INSERT INTO mockup_choice_attempts (bucket) VALUES ($1)
       ON CONFLICT (bucket) DO UPDATE SET
         attempts = CASE WHEN mockup_choice_attempts.window_start < now() - interval '15 minutes' THEN 1 ELSE mockup_choice_attempts.attempts + 1 END,
         window_start = CASE WHEN mockup_choice_attempts.window_start < now() - interval '15 minutes' THEN now() ELSE mockup_choice_attempts.window_start END
       RETURNING attempts`,
      [bucket]
    );
    if (!limitRows[0] || limitRows[0].attempts > 5) {
      return NextResponse.json({ error: "Please wait a few minutes before sending another message." }, {
        status: 429,
        headers: { "Retry-After": "900" },
      });
    }

    const trimmedNotes = typeof notes === "string" ? notes.trim() : "";
    const trimmedEmail = typeof email === "string" ? email.trim() : "";
    const trimmedPhone = typeof phone === "string" ? phone.trim() : "";

    const pipelineContactId = await createPipelineContact({
      mockupName: mockup.name,
      concept: concept.trim(),
      contactName: name.trim(),
      contactEmail: trimmedEmail || null,
      contactPhone: trimmedPhone || null,
      notes: trimmedNotes || null,
    });

    const choice = await createChoice({
      mockupSlug: slug,
      concept: concept.trim(),
      contactName: name.trim(),
      contactEmail: trimmedEmail || null,
      contactPhone: trimmedPhone || null,
      notes: trimmedNotes || null,
      pipelineContactId,
    });

    logAudit(req, {
      action: "mockup.choice_sent",
      resourceType: "mockup",
      resourceId: slug,
      resourceLabel: mockup.name,
      description: `${name.trim()} picked "${concept.trim()}" on the ${mockup.name} mockup.`,
      metadata: { concept: concept.trim(), choiceId: choice.id, pipelineContactId },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("MOCKUP_CHOICE_POST_ERR:", err);
    return NextResponse.json({ error: "We couldn't save your message. Please try again shortly." }, { status: 503 });
  }
}

export const POST = withActivity("/api/mockups/[slug]/choice", "POST", handlePOST);

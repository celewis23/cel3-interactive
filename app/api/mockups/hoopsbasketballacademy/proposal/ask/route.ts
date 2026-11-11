import { NextRequest, NextResponse } from "next/server";
import { withActivity } from "@/lib/audit/withActivity";
import { sanityWriteClient } from "@/lib/sanity.write";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function handleActivityPOST(req: NextRequest) {
  try {
    const body = await req.json();
    const kind: "question" | "call" = body.kind === "call" ? "call" : "question";
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim() : "";
    const message = typeof body.message === "string" ? body.message.trim() : "";
    const preferredTime = typeof body.preferredTime === "string" ? body.preferredTime.trim() : "";

    if (!name || !email) {
      return NextResponse.json({ error: "Name and email are required." }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "A valid email address is required." }, { status: 400 });
    }
    if (kind === "question" && !message) {
      return NextResponse.json({ error: "Please add a short message." }, { status: 400 });
    }

    const now = new Date().toISOString();
    const notes = kind === "call"
      ? `Source: Hoops Basketball Academy proposal — request a call\nPreferred time: ${preferredTime || "not specified"}\n${message}`
      : `Source: Hoops Basketball Academy proposal — ask a question\n${message}`;

    const contact = await sanityWriteClient.create({
      _type: "pipelineContact",
      name,
      email: email.toLowerCase(),
      phone: typeof body.phone === "string" ? body.phone.trim() : "",
      company: "Hoops Basketball Academy",
      source: kind === "call" ? "Hoops Basketball Academy proposal — request a call" : "Hoops Basketball Academy proposal — ask a question",
      notes,
      owner: null,
      stage: "new-lead",
      stageEnteredAt: now,
      estimatedValue: null,
      stripeCustomerId: null,
      closedAt: null,
    });

    await sanityWriteClient.create({
      _type: "pipelineActivity",
      contactId: contact._id,
      type: "created",
      text: kind === "call" ? "Requested a call about the Hoops Basketball Academy proposal" : "Asked a question about the Hoops Basketball Academy proposal",
      fromStage: null,
      toStage: "new-lead",
      author: "Hoops Basketball Academy proposal",
    });

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    console.error("HOOPS_PROPOSAL_ASK_ERR:", err);
    return NextResponse.json({ error: "Could not send your message. Please try again." }, { status: 500 });
  }
}

export const POST = withActivity("/api/mockups/hoopsbasketballacademy/proposal/ask", "POST", handleActivityPOST);

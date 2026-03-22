import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/permissions";
import { sanityServer } from "@/lib/sanityServer";
import { sanityWriteClient } from "@/lib/sanity.write";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const authErr = await requirePermission(req, "leads", "view");
  if (authErr) return authErr;

  try {
    const contacts = await sanityServer.fetch(
      `*[_type == "pipelineContact"] | order(stageEnteredAt desc) {
        _id, _type, _createdAt,
        name, email, phone, company, source, notes, owner,
        stage, stageEnteredAt, estimatedValue, stripeCustomerId,
        closedAt, driveFileUrl, driveFileName, followUpEventId
      }`
    );
    return NextResponse.json(contacts);
  } catch (err) {
    console.error("PIPELINE_CONTACTS_GET_ERR:", err);
    return NextResponse.json({ error: "Failed to fetch contacts" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const authErr = await requirePermission(req, "leads", "edit");
  if (authErr) return authErr;

  try {
    const body = await req.json();
    if (!body.name?.trim()) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    const now = new Date().toISOString();
    const contact = await sanityWriteClient.create({
      _type: "pipelineContact",
      name: body.name.trim(),
      email: body.email?.trim() || null,
      phone: body.phone?.trim() || null,
      company: body.company?.trim() || null,
      source: body.source?.trim() || null,
      notes: body.notes?.trim() || null,
      owner: body.owner?.trim() || null,
      stage: body.stage || "new-lead",
      stageEnteredAt: now,
      estimatedValue: body.estimatedValue ? Number(body.estimatedValue) : null,
      stripeCustomerId: null,
      closedAt: null,
      driveFileUrl: null,
      driveFileName: null,
      followUpEventId: null,
    });

    // Create "created" activity
    await sanityWriteClient.create({
      _type: "pipelineActivity",
      contactId: contact._id,
      type: "created",
      text: `Contact created`,
      fromStage: null,
      toStage: contact.stage,
      author: "Admin",
    });

    return NextResponse.json(contact, { status: 201 });
  } catch (err) {
    console.error("PIPELINE_CONTACTS_POST_ERR:", err);
    return NextResponse.json({ error: "Failed to create contact" }, { status: 500 });
  }
}

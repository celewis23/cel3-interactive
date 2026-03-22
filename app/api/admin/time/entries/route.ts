import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken, COOKIE_NAME } from "@/lib/admin/auth";
import { sanityServer } from "@/lib/sanityServer";
import { sanityWriteClient } from "@/lib/sanity.write";

export const runtime = "nodejs";

function requireAuth(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return false;
  return verifySessionToken(token)?.step === "full";
}

export async function GET(req: NextRequest) {
  if (!requireAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const projectId = searchParams.get("projectId");
    const clientName = searchParams.get("clientName");
    const billable = searchParams.get("billable");
    const billed = searchParams.get("billed"); // "true" | "false"
    const active = searchParams.get("active"); // "true" = running only

    const filters: string[] = [`_type == "timeEntry"`];
    if (from) filters.push(`date >= "${from}"`);
    if (to) filters.push(`date <= "${to}"`);
    if (projectId) filters.push(`projectId == "${projectId}"`);
    if (clientName) filters.push(`clientName == "${clientName}"`);
    if (billable === "true") filters.push(`billable == true`);
    if (billable === "false") filters.push(`billable == false`);
    if (billed === "true") filters.push(`invoiceId != null`);
    if (billed === "false") filters.push(`invoiceId == null`);
    if (active === "true") filters.push(`endTime == null`);

    const entries = await sanityServer.fetch(
      `*[${filters.join(" && ")}] | order(date desc, startTime desc) {
        _id, date, startTime, endTime, durationSeconds, description,
        projectId, projectName, taskId, taskTitle,
        clientName, pipelineContactId, stripeCustomerId,
        billable, hourlyRate, invoiceId, billedAt, _createdAt
      }`
    );
    return NextResponse.json(entries);
  } catch (err) {
    console.error("TIME_ENTRIES_GET_ERR:", err);
    return NextResponse.json({ error: "Failed to fetch time entries" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!requireAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await req.json();

    // Enforce at most one active timer
    if (!body.endTime) {
      const running = await sanityServer.fetch<{ _id: string } | null>(
        `*[_type == "timeEntry" && endTime == null][0]{ _id }`
      );
      if (running) {
        return NextResponse.json(
          { error: "A timer is already running. Stop it before starting a new one." },
          { status: 409 }
        );
      }
    }

    const now = new Date().toISOString();
    const startTime = body.startTime || now;
    const date = body.date || now.slice(0, 10);

    // Compute duration if both times provided
    let durationSeconds = body.durationSeconds ?? 0;
    if (body.endTime && body.startTime && !body.durationSeconds) {
      durationSeconds = Math.round(
        (new Date(body.endTime).getTime() - new Date(body.startTime).getTime()) / 1000
      );
    }

    const entry = await sanityWriteClient.create({
      _type: "timeEntry",
      date,
      startTime,
      endTime: body.endTime || null,
      durationSeconds: Math.max(0, durationSeconds),
      description: body.description?.trim() || null,
      projectId: body.projectId || null,
      projectName: body.projectName || null,
      taskId: body.taskId || null,
      taskTitle: body.taskTitle || null,
      clientName: body.clientName?.trim() || null,
      pipelineContactId: body.pipelineContactId || null,
      stripeCustomerId: body.stripeCustomerId || null,
      billable: body.billable !== false,
      hourlyRate: body.hourlyRate ?? 0,
      invoiceId: null,
      billedAt: null,
    });

    return NextResponse.json(entry, { status: 201 });
  } catch (err) {
    console.error("TIME_ENTRIES_POST_ERR:", err);
    return NextResponse.json({ error: "Failed to create time entry" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { verifyPortalSessionToken, PORTAL_COOKIE } from "@/lib/portal/auth";
import { sanityServer } from "@/lib/sanityServer";
import { sanityWriteClient } from "@/lib/sanity.write";
import { createPortalTicketArtifacts } from "@/lib/portal/provision";
import { Resend } from "resend";

export const runtime = "nodejs";

const resend = new Resend(process.env.RESEND_API_KEY);
const ADMIN_EMAIL = process.env.ADMIN_NOTIFICATION_EMAIL ?? "cel3media@gmail.com";
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? "noreply@cel3interactive.com";

async function getPortalContext(userId: string) {
  return sanityServer.fetch<{
    _id: string;
    email: string;
    stripeCustomerId: string | null;
    pipelineContactId: string | null;
    driveRootFolderId: string | null;
  } | null>(
    `*[_type == "clientPortalUser" && _id == $id][0]{
      _id, email, stripeCustomerId, pipelineContactId, driveRootFolderId
    }`,
    { id: userId }
  );
}

export async function GET(req: NextRequest) {
  const token = req.cookies.get(PORTAL_COOKIE)?.value;
  const session = token ? verifyPortalSessionToken(token) : null;
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const user = await getPortalContext(session.userId);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const refs = [user.stripeCustomerId, user.pipelineContactId].filter(Boolean) as string[];
    const [tickets, projects] = await Promise.all([
      sanityServer.fetch(
        `*[_type == "clientPortalTicket" && portalUserId == $userId] | order(updatedAt desc){
          _id, title, description, status, priority, projectId, projectName,
          createdAt, updatedAt, adminNotes, ticketNotes, driveFolderId, attachments
        }`,
        { userId: session.userId }
      ),
      refs.length > 0
        ? sanityServer.fetch(
            `*[_type == "pmProject" && clientRef in $refs] | order(_createdAt desc){
              _id, name, status
            }`,
            { refs }
          )
        : [],
    ]);

    return NextResponse.json({ tickets, projects });
  } catch (err) {
    console.error("PORTAL_TICKETS_GET_ERR:", err);
    return NextResponse.json({ error: "Failed to load requests" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const token = req.cookies.get(PORTAL_COOKIE)?.value;
  const session = token ? verifyPortalSessionToken(token) : null;
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const user = await getPortalContext(session.userId);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const formData = await req.formData();
    const title = String(formData.get("title") || "").trim();
    const description = String(formData.get("description") || "").trim();
    const priority = String(formData.get("priority") || "medium").trim();
    const projectIdValue = String(formData.get("projectId") || "").trim() || null;
    const files = formData.getAll("files").filter((value): value is File => value instanceof File && value.size > 0);

    if (!title || !description) {
      return NextResponse.json({ error: "Title and description are required" }, { status: 400 });
    }

    let projectName: string | null = null;
    if (projectIdValue) {
      const project = await sanityServer.fetch<{ name: string } | null>(
        `*[_type == "pmProject" && _id == $id][0]{ name }`,
        { id: projectIdValue }
      );
      projectName = project?.name ?? null;
    }

    const now = new Date().toISOString();
    const created = await sanityWriteClient.create({
      _type: "clientPortalTicket",
      title,
      description,
      status: "submitted",
      priority,
      portalUserId: session.userId,
      stripeCustomerId: user.stripeCustomerId ?? null,
      pipelineContactId: user.pipelineContactId ?? null,
      clientEmail: user.email,
      projectId: projectIdValue,
      projectName,
      adminNotes: null,
      ticketNotes: [],
      driveFolderId: null,
      attachments: [],
      createdAt: now,
      updatedAt: now,
    });

    const ticketKey = `Request-${created._id.slice(-6)}`;
    const artifacts = await createPortalTicketArtifacts({
      driveRootFolderId: user.driveRootFolderId,
      ticketKey,
      files,
    });

    const updated = await sanityWriteClient.patch(created._id).set({
      driveFolderId: artifacts.driveFolderId,
      attachments: artifacts.attachments,
      updatedAt: new Date().toISOString(),
    }).commit();

    // Notify admin of new request (fire-and-forget)
    resend.emails.send({
      from: FROM_EMAIL,
      to: [ADMIN_EMAIL],
      subject: `New client request: ${title}`,
      html: `
        <div style="font-family:sans-serif;max-width:540px;margin:0 auto">
          <h2 style="margin:0 0 8px;font-size:18px">New Client Request</h2>
          <p style="margin:0 0 16px;color:#555;font-size:14px">
            ${user.email} submitted a new request${projectName ? ` on <strong>${projectName}</strong>` : ""}.
          </p>
          <table style="width:100%;border-collapse:collapse;font-size:13px">
            <tr><td style="padding:6px 0;color:#888;width:100px">Title</td><td style="padding:6px 0;font-weight:600">${title}</td></tr>
            <tr><td style="padding:6px 0;color:#888">Priority</td><td style="padding:6px 0;text-transform:capitalize">${priority}</td></tr>
            <tr><td style="padding:6px 0;color:#888;vertical-align:top">Description</td><td style="padding:6px 0;white-space:pre-wrap">${description}</td></tr>
          </table>
          <a href="${process.env.NEXT_PUBLIC_APP_URL ?? "https://cel3interactive.com"}/admin/portal-requests"
             style="display:inline-block;margin-top:20px;padding:10px 20px;background:#0ea5e9;color:#fff;text-decoration:none;border-radius:8px;font-size:13px;font-weight:600">
            View in Admin Console
          </a>
        </div>
      `,
      text: `New client request from ${user.email}\n\nTitle: ${title}\nPriority: ${priority}\n\n${description}`,
    }).catch((e) => console.error("TICKET_EMAIL_ERR:", e));

    return NextResponse.json(updated, { status: 201 });
  } catch (err) {
    console.error("PORTAL_TICKETS_POST_ERR:", err);
    return NextResponse.json({ error: "Failed to create request" }, { status: 500 });
  }
}

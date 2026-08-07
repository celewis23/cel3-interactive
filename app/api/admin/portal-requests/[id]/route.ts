import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/permissions";
import { sanityServer } from "@/lib/sanityServer";
import { sanityWriteClient } from "@/lib/sanity.write";
import { v4 as uuidv4 } from "uuid";
import { Resend } from "resend";

export const runtime = "nodejs";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? "noreply@cel3interactive.com";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? "https://cel3interactive.com";

type TicketNote = { _key: string; text: string; createdAt: string };

const STATUS_LABELS: Record<string, string> = {
  submitted: "Submitted",
  in_progress: "In Progress",
  waiting_on_client: "Waiting on You",
  completed: "Completed",
  closed: "Closed",
};

function formatStatus(status: string) {
  return STATUS_LABELS[status] ?? status.replaceAll("_", " ");
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authErr = await requirePermission(req, "clients", "edit");
  if (authErr) return authErr;

  try {
    const { id } = await params;
    const body = await req.json();
    const now = new Date().toISOString();

    const current = await sanityServer.fetch<{
      title: string;
      status: string;
      clientEmail: string | null;
      ticketNotes: TicketNote[] | null;
      adminNotes: string | null;
    } | null>(
      `*[_type == "clientPortalTicket" && _id == $id][0]{ title, status, clientEmail, ticketNotes, adminNotes }`,
      { id }
    );

    let mutation = sanityWriteClient.patch(id).set({ updatedAt: now });

    const nextStatus = "status" in body ? (body.status ?? "submitted") : null;
    if (nextStatus) {
      mutation = mutation.set({ status: nextStatus });
    }

    let newNote: TicketNote | null = null;
    if ("noteText" in body && typeof body.noteText === "string" && body.noteText.trim()) {
      newNote = { _key: uuidv4(), text: body.noteText.trim(), createdAt: now };
      mutation = mutation
        .setIfMissing({ ticketNotes: [] })
        .insert("after", "ticketNotes[-1]", [newNote]);
    }

    const updated = await mutation.commit();

    if (nextStatus && current && current.status !== nextStatus && current.clientEmail) {
      const notes = [...(current.ticketNotes ?? []), ...(newNote ? [newNote] : [])].reverse();
      const legacyNote = current.adminNotes && notes.length === 0 ? current.adminNotes : null;

      const notesHtml = notes.length || legacyNote
        ? `
          <div style="margin-top:16px">
            <p style="margin:0 0 8px;color:#888;font-size:12px;text-transform:uppercase;letter-spacing:.04em">Team Notes</p>
            ${legacyNote ? `<div style="padding:10px 12px;margin-bottom:8px;background:#f6f7f9;border-radius:8px;font-size:13px;white-space:pre-wrap">${legacyNote}</div>` : ""}
            ${notes.map((note) => `<div style="padding:10px 12px;margin-bottom:8px;background:#f6f7f9;border-radius:8px;font-size:13px;white-space:pre-wrap">${note.text}</div>`).join("")}
          </div>
        `
        : "";
      const notesText = notes.length
        ? `\n\nTeam Notes:\n${notes.map((note) => `- ${note.text}`).join("\n")}`
        : legacyNote
          ? `\n\nTeam Notes:\n- ${legacyNote}`
          : "";

      resend.emails.send({
        from: FROM_EMAIL,
        to: [current.clientEmail],
        subject: `Update on your request: ${current.title}`,
        html: `
          <div style="font-family:sans-serif;max-width:540px;margin:0 auto">
            <h2 style="margin:0 0 8px;font-size:18px">Your request status changed</h2>
            <p style="margin:0 0 16px;color:#555;font-size:14px">
              <strong>${current.title}</strong> is now <strong>${formatStatus(nextStatus)}</strong>.
            </p>
            ${notesHtml}
            <a href="${APP_URL}/portal/requests"
               style="display:inline-block;margin-top:20px;padding:10px 20px;background:#0ea5e9;color:#fff;text-decoration:none;border-radius:8px;font-size:13px;font-weight:600">
              View Request
            </a>
          </div>
        `,
        text: `Your request "${current.title}" is now ${formatStatus(nextStatus)}.${notesText}`,
      }).catch((e) => console.error("PORTAL_REQUEST_STATUS_EMAIL_ERR:", e));
    }

    return NextResponse.json(updated);
  } catch (err) {
    console.error("ADMIN_PORTAL_REQUEST_PATCH_ERR:", err);
    return NextResponse.json({ error: "Failed to update request" }, { status: 500 });
  }
}

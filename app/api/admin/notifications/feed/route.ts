export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken, COOKIE_NAME } from "@/lib/admin/auth";
import { sanityServer } from "@/lib/sanityServer";
import { listThreads } from "@/lib/gmail/api";

type NotificationItem = {
  key: string;
  kind: "email" | "form_submission" | "lead" | "booking" | "announcement";
  title: string;
  body: string;
  href: string;
  timestamp: string;
  severity?: "normal" | "urgent";
};

type RolePermissions = Record<string, Record<string, boolean>>;

function truncate(value: string, max = 140): string {
  if (value.length <= max) return value;
  return `${value.slice(0, Math.max(0, max - 1)).trimEnd()}…`;
}

function canAccess(isOwner: boolean, permissions: RolePermissions | null, module: string, action: string) {
  if (isOwner) return true;
  return !!permissions?.[module]?.[action];
}

export async function GET(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const session = verifySessionToken(token);
  if (!session || session.step !== "full") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isOwner = !session.staffId;
  const staffId = session.staffId ?? null;

  let permissions: RolePermissions | null = null;
  if (!isOwner && session.roleSlug) {
    const role = await sanityServer.fetch<{ permissions: RolePermissions } | null>(
      `*[_type == "staffRole" && slug == $slug][0]{ permissions }`,
      { slug: session.roleSlug }
    );
    permissions = role?.permissions ?? null;
  }

  const notifications: NotificationItem[] = [];

  const jobs: Promise<void>[] = [];

  if (canAccess(isOwner, permissions, "email", "view")) {
    jobs.push((async () => {
      try {
        const result = await listThreads({ labelIds: ["INBOX"], maxResults: 10 });
        for (const thread of result.threads.filter((item) => !item.isRead).slice(0, 6)) {
          notifications.push({
            key: `email:${thread.id}:${thread.date}:${thread.messageCount}`,
            kind: "email",
            title: thread.subject || "New email",
            body: truncate(thread.participant || thread.from || thread.snippet || "New unread email"),
            href: `/admin/email/thread/${thread.id}`,
            timestamp: new Date(thread.date).toISOString(),
          });
        }
      } catch (err) {
        console.error("NOTIFICATIONS_FEED_EMAIL_ERR:", err);
      }
    })());
  }

  if (canAccess(isOwner, permissions, "forms", "view")) {
    jobs.push((async () => {
      try {
        const submissions = await sanityServer.fetch<Array<{
          _id: string;
          submittedAt: string;
          formId: string;
          formTitle: string | null;
        }>>(
          `*[_type == "cel3FormSubmission"] | order(submittedAt desc)[0...8]{
            _id,
            submittedAt,
            formId,
            "formTitle": *[_type == "cel3Form" && _id == ^.formId][0].title
          }`
        );

        for (const submission of submissions) {
          const formTitle = submission.formTitle || "Form submission";
          notifications.push({
            key: `form:${submission._id}:${submission.submittedAt}`,
            kind: "form_submission",
            title: "New form submission",
            body: truncate(formTitle),
            href: `/admin/forms/${submission.formId}/submissions`,
            timestamp: submission.submittedAt,
          });
        }
      } catch (err) {
        console.error("NOTIFICATIONS_FEED_FORMS_ERR:", err);
      }
    })());
  }

  if (canAccess(isOwner, permissions, "leads", "view")) {
    jobs.push((async () => {
      try {
        const leads = await sanityServer.fetch<Array<{
          _id: string;
          _createdAt: string;
          name: string | null;
          company: string | null;
          stage: string | null;
        }>>(
          `*[_type == "pipelineContact"] | order(_createdAt desc)[0...8]{
            _id, _createdAt, name, company, stage
          }`
        );

        for (const lead of leads) {
          notifications.push({
            key: `lead:${lead._id}:${lead._createdAt}`,
            kind: "lead",
            title: "New lead",
            body: truncate(
              [lead.name || "Unnamed lead", lead.company || null, lead.stage || null]
                .filter(Boolean)
                .join(" • ")
            ),
            href: `/admin/pipeline/contacts/${lead._id}`,
            timestamp: lead._createdAt,
          });
        }
      } catch (err) {
        console.error("NOTIFICATIONS_FEED_LEADS_ERR:", err);
      }
    })());
  }

  jobs.push((async () => {
    try {
      const bookings = await sanityServer.fetch<Array<{
        _id: string;
        _createdAt: string;
        customerName: string;
        startsAtUtc: string;
        status: string;
      }>>(
        `*[_type == "assessmentBooking" && status == "CONFIRMED"] | order(_createdAt desc)[0...8]{
          _id, _createdAt, customerName, startsAtUtc, status
        }`
      );

      for (const booking of bookings) {
        notifications.push({
          key: `booking:${booking._id}:${booking._createdAt}`,
          kind: "booking",
          title: "New booking confirmed",
          body: truncate(`${booking.customerName} • ${booking.startsAtUtc}`),
          href: "/admin/bookings",
          timestamp: booking._createdAt,
        });
      }
    } catch (err) {
      console.error("NOTIFICATIONS_FEED_BOOKINGS_ERR:", err);
    }
  })());

  if (canAccess(isOwner, permissions, "announcements", "view")) {
    jobs.push((async () => {
      try {
        const now = new Date().toISOString();
        const filter = isOwner
          ? `_type == "announcement" && archived != true && (expiryDate == null || expiryDate >= $now)`
          : `_type == "announcement" && archived != true && (expiryDate == null || expiryDate >= $now) && !($staffId in readBy)`;

        const announcements = await sanityServer.fetch<Array<{
          _id: string;
          title: string;
          body: string;
          priority: "normal" | "urgent";
          createdAt: string;
        }>>(
          `*[${filter}] | order(select(priority == "urgent" => 0, 1) asc, createdAt desc)[0...8]{
            _id, title, body, priority, createdAt
          }`,
          { now, staffId }
        );

        for (const announcement of announcements) {
          notifications.push({
            key: `announcement:${announcement._id}:${announcement.createdAt}`,
            kind: "announcement",
            title: announcement.title,
            body: truncate(announcement.body || "New team announcement"),
            href: "/admin/announcements",
            timestamp: announcement.createdAt,
            severity: announcement.priority,
          });
        }
      } catch (err) {
        console.error("NOTIFICATIONS_FEED_ANNOUNCEMENTS_ERR:", err);
      }
    })());
  }

  await Promise.all(jobs);

  notifications.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return NextResponse.json({
    notifications: notifications.slice(0, 30),
  });
}

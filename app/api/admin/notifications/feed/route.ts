export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken, COOKIE_NAME } from "@/lib/admin/auth";
import { sanityServer } from "@/lib/sanityServer";
import { listThreads } from "@/lib/gmail/api";
import { listUnreadMessageNotifications } from "@/lib/messaging/service";

type NotificationItem = {
  key: string;
  kind: "email" | "form_submission" | "lead" | "booking" | "announcement" | "message" | "client_request";
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
  const requestedKind = req.nextUrl.searchParams.get("kind");
  const categoryView = !!requestedKind;
  let categoryFailed = false;

  const jobs: Promise<void>[] = [];

  if (canAccess(isOwner, permissions, "email", "view")) {
    jobs.push((async () => {
      if (requestedKind && requestedKind !== "email") return;
      try {
        const result = await listThreads({ labelIds: ["INBOX"], q: "is:unread", maxResults: categoryView ? 50 : 10 });
        for (const thread of result.threads.filter((item) => !item.isRead).slice(0, categoryView ? 50 : 6)) {
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
        if (requestedKind === "email") categoryFailed = true;
      }
    })());
  }

  if (canAccess(isOwner, permissions, "forms", "view")) {
    jobs.push((async () => {
      if (requestedKind && requestedKind !== "form_submission") return;
      try {
        const submissions = await sanityServer.fetch<Array<{
          _id: string;
          submittedAt: string;
          formId: string;
          formTitle: string | null;
        }>>(
          `*[_type == "cel3FormSubmission"] | order(submittedAt desc)[0...${categoryView ? 50 : 8}]{
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
        if (requestedKind === "form_submission") categoryFailed = true;
      }
    })());
  }

  if (canAccess(isOwner, permissions, "leads", "view")) {
    jobs.push((async () => {
      if (requestedKind && requestedKind !== "lead") return;
      try {
        const leads = await sanityServer.fetch<Array<{
          _id: string;
          _createdAt: string;
          name: string | null;
          company: string | null;
          stage: string | null;
        }>>(
          `*[_type == "pipelineContact"] | order(_createdAt desc)[0...${categoryView ? 50 : 8}]{
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
        if (requestedKind === "lead") categoryFailed = true;
      }
    })());
  }

  if (canAccess(isOwner, permissions, "clients", "view")) {
    jobs.push((async () => {
      if (requestedKind && requestedKind !== "message") return;
      try {
        const actorId = isOwner ? "admin:owner" : `admin:${staffId}`;
        const messages = await listUnreadMessageNotifications(actorId, categoryView ? 50 : 8);

        for (const message of messages) {
          notifications.push({
            key: `message:${message._id}:${message.createdAt}`,
            kind: "message",
            title: message.title || "New client message",
            body: truncate(message.body || "Open the conversation"),
            href: message.linkUrl || `/admin/messages/${message.entityId}`,
            timestamp: message.createdAt,
          });
        }
      } catch (err) {
        console.error("NOTIFICATIONS_FEED_MESSAGES_ERR:", err);
        if (requestedKind === "message") categoryFailed = true;
      }
    })());

    jobs.push((async () => {
      if (requestedKind && requestedKind !== "client_request") return;
      try {
        const requests = await sanityServer.fetch<Array<{
          _id: string;
          title: string;
          clientEmail: string | null;
          createdAt: string;
          updatedAt: string;
        }>>(
          `*[_type == "clientPortalTicket"] | order(createdAt desc)[0...${categoryView ? 50 : 8}]{
            _id, title, clientEmail, createdAt, updatedAt
          }`
        );

        for (const request of requests) {
          notifications.push({
            key: `client_request:${request._id}:${request.createdAt}`,
            kind: "client_request",
            title: "New client request",
            body: truncate(`${request.clientEmail || "Client"}: ${request.title || "Untitled request"}`),
            href: `/admin/portal-requests?requestId=${encodeURIComponent(request._id)}`,
            timestamp: request.createdAt || request.updatedAt,
          });
        }
      } catch (err) {
        console.error("NOTIFICATIONS_FEED_CLIENT_REQUESTS_ERR:", err);
        if (requestedKind === "client_request") categoryFailed = true;
      }
    })());
  }

  jobs.push((async () => {
    if (requestedKind && requestedKind !== "booking") return;
    try {
      const bookings = await sanityServer.fetch<Array<{
        _id: string;
        _createdAt: string;
        customerName: string;
        startsAtUtc: string;
        status: string;
      }>>(
        `*[_type == "assessmentBooking" && status == "CONFIRMED"] | order(_createdAt desc)[0...${categoryView ? 50 : 8}]{
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
        if (requestedKind === "booking") categoryFailed = true;
    }
  })());

  if (canAccess(isOwner, permissions, "announcements", "view")) {
    jobs.push((async () => {
      if (requestedKind && requestedKind !== "announcement") return;
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
          `*[${filter}] | order(select(priority == "urgent" => 0, 1) asc, createdAt desc)[0...${categoryView ? 50 : 8}]{
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
        if (requestedKind === "announcement") categoryFailed = true;
      }
    })());
  }

  await Promise.all(jobs);

  if (categoryFailed) return NextResponse.json({ error: "Could not load this notification category" }, { status: 503 });

  notifications.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return NextResponse.json({
    notifications: (requestedKind ? notifications.filter(item => item.kind === requestedKind) : notifications).slice(0, categoryView ? 50 : 30),
  });
}

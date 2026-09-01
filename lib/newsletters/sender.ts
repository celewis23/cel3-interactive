import { Resend } from "resend";
import { sanityServer } from "@/lib/sanityServer";
import { createPortalNotification } from "@/lib/portal/notifications";
import { listGroupMembers } from "@/lib/campaigns/db";
import {
  createPortalDeliveries,
  getNewsletterById,
  markNewsletterEmailResults,
  markNewsletterFailed,
  markNewsletterPublished,
  recordNewsletterEmailSend,
  updateNewsletter,
} from "@/lib/newsletters/db";
import { buildNewsletterEmailHtml } from "@/lib/newsletters/render";

const resend = new Resend(process.env.RESEND_API_KEY!);
const FROM = process.env.RESEND_FROM_EMAIL ?? "CEL3 Interactive <noreply@cel3interactive.com>";

type PortalRecipient = {
  id: string;
  email: string;
  name: string | null;
};

async function getPortalUserRecipients(): Promise<PortalRecipient[]> {
  return sanityServer.fetch<PortalRecipient[]>(
    `*[_type == "clientPortalUser" && status == "active"]{ "id": _id, email, name }`
  );
}

async function getGroupPortalRecipients(groupId: string): Promise<PortalRecipient[]> {
  const members = await listGroupMembers(groupId);
  const ids = members.filter((m) => m.memberType === "portal_user").map((m) => m.memberId);
  if (ids.length === 0) return [];
  return sanityServer.fetch<PortalRecipient[]>(
    `*[_type == "clientPortalUser" && _id in $ids && status != "suspended"]{ "id": _id, email, name }`,
    { ids }
  );
}

function dedupeRecipients(recipients: PortalRecipient[]): PortalRecipient[] {
  const seen = new Set<string>();
  return recipients.filter((recipient) => {
    const key = recipient.email.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function publishNewsletter(
  newsletterId: string,
  options?: { sendEmail?: boolean }
): Promise<{ portalDeliveries: number; emailSent: number; emailErrors: number }> {
  const newsletter = await getNewsletterById(newsletterId);
  if (!newsletter) throw new Error("Newsletter not found");

  await updateNewsletter(newsletterId, { status: "publishing" });

  let recipients: PortalRecipient[] = [];
  try {
    recipients = newsletter.targetType === "group" && newsletter.groupId
      ? await getGroupPortalRecipients(newsletter.groupId)
      : await getPortalUserRecipients();
    recipients = dedupeRecipients(recipients);
  } catch (err) {
    await markNewsletterFailed(newsletterId);
    throw err;
  }

  const portalDeliveries = await createPortalDeliveries(newsletterId, recipients.map((r) => r.id));
  const sendEmail = options?.sendEmail ?? newsletter.sendEmail;

  await Promise.all(recipients.map((recipient) =>
    createPortalNotification({
      userId: recipient.id,
      title: "New newsletter",
      body: newsletter.subject,
      entityType: "Newsletter",
      entityId: newsletter.id,
      linkUrl: `/portal/newsletters/${newsletter.id}`,
      pushTag: `newsletter:${newsletter.id}:${recipient.id}`,
    }).catch((err) => console.error("NEWSLETTER_NOTIFICATION_ERR:", err))
  ));

  await markNewsletterPublished(newsletterId, portalDeliveries, sendEmail);

  let emailSent = 0;
  let emailErrors = 0;

  if (sendEmail) {
    const latest = await getNewsletterById(newsletterId);
    if (!latest) throw new Error("Newsletter not found after publish");
    const html = buildNewsletterEmailHtml(latest);

    for (const recipient of recipients) {
      try {
        await resend.emails.send({
          from: FROM,
          to: recipient.email,
          subject: latest.subject,
          html,
        });
        emailSent++;
        await recordNewsletterEmailSend({
          newsletterId,
          portalUserId: recipient.id,
          recipientEmail: recipient.email,
          recipientName: recipient.name,
          status: "sent",
        });
      } catch (err) {
        emailErrors++;
        await recordNewsletterEmailSend({
          newsletterId,
          portalUserId: recipient.id,
          recipientEmail: recipient.email,
          recipientName: recipient.name,
          status: "failed",
          error: err instanceof Error ? err.message : "Email send failed",
        });
      }
    }

    await markNewsletterEmailResults(newsletterId, emailSent, emailErrors);
  }

  return { portalDeliveries, emailSent, emailErrors };
}

import { Resend } from "resend";
import { sanityServer } from "@/lib/sanityServer";
import {
  getCampaignById,
  createCampaignSend,
  listActiveSubscribers,
  listGroupMembers,
  markCampaignSent,
  markCampaignFailed,
  updateCampaign,
} from "@/lib/campaigns/db";

const resend = new Resend(process.env.RESEND_API_KEY!);
const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://cel3interactive.com";
const FROM = process.env.RESEND_FROM_EMAIL ?? "CEL3 Interactive <noreply@cel3interactive.com>";

// ─── Email template wrapper ───────────────────────────────────────────────────

function buildEmailHtml(subject: string, bodyHtml: string, trackToken: string): string {
  const openPixel = `<img src="${BASE_URL}/api/campaign/track/${trackToken}/open" width="1" height="1" alt="" style="display:block;width:1px;height:1px;border:0;" />`;
  const unsubLink = `${BASE_URL}/api/campaign/unsubscribe/${trackToken}`;
  const trackedBody = injectClickTracking(bodyHtml, trackToken);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:40px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08);">
        <!-- Header -->
        <tr>
          <td style="background:#0a0a0a;padding:24px 32px;">
            <p style="margin:0;font-size:20px;font-weight:700;color:#ffffff;">CEL3 <span style="color:#0ea5e9;">Interactive</span></p>
          </td>
        </tr>
        <!-- Subject -->
        <tr>
          <td style="padding:32px 32px 0;">
            <h1 style="margin:0;font-size:24px;font-weight:700;color:#111827;line-height:1.3;">${escHtml(subject)}</h1>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:24px 32px 32px;color:#374151;font-size:15px;line-height:1.7;">
            ${trackedBody}
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="padding:24px 32px;border-top:1px solid #f3f4f6;background:#f9fafb;">
            <p style="margin:0 0 8px;font-size:12px;color:#9ca3af;text-align:center;">
              You received this because you are a registered client or subscriber of CEL3 Interactive.
            </p>
            <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">
              <a href="${unsubLink}" style="color:#9ca3af;text-decoration:underline;">Unsubscribe</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
  ${openPixel}
</body>
</html>`;
}

function escHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function injectClickTracking(html: string, trackToken: string): string {
  return html.replace(/href="(https?:\/\/[^"]+)"/g, (_, url: string) => {
    const tracked = `${BASE_URL}/api/campaign/track/${trackToken}/click?url=${encodeURIComponent(url)}`;
    return `href="${tracked}"`;
  });
}

// ─── Recipient resolution ─────────────────────────────────────────────────────

interface Recipient {
  email: string;
  name: string | null;
  type: "portal_user" | "subscriber";
  id: string;
}

async function getPortalUserRecipients(): Promise<Recipient[]> {
  const users = await sanityServer.fetch<Array<{ _id: string; email: string; name: string | null }>>(
    `*[_type == "clientPortalUser" && status == "active"]{ _id, email, name }`
  );
  return users.map((u) => ({ email: u.email, name: u.name, type: "portal_user", id: u._id }));
}

async function getSubscriberRecipients(): Promise<Recipient[]> {
  const subs = await listActiveSubscribers();
  return subs.map((s) => ({ email: s.email, name: s.name, type: "subscriber", id: s.id }));
}

async function getGroupRecipients(groupId: string): Promise<Recipient[]> {
  const members = await listGroupMembers(groupId);
  const recipients: Recipient[] = [];

  const portalIds = members.filter((m) => m.memberType === "portal_user").map((m) => m.memberId);
  const subIds = members.filter((m) => m.memberType === "subscriber").map((m) => m.memberId);

  if (portalIds.length > 0) {
    const users = await sanityServer.fetch<Array<{ _id: string; email: string; name: string | null }>>(
      `*[_type == "clientPortalUser" && _id in $ids]{ _id, email, name }`,
      { ids: portalIds }
    );
    users.forEach((u) => recipients.push({ email: u.email, name: u.name, type: "portal_user", id: u._id }));
  }

  if (subIds.length > 0) {
    const subs = await listActiveSubscribers();
    subs.filter((s) => subIds.includes(s.id)).forEach((s) =>
      recipients.push({ email: s.email, name: s.name, type: "subscriber", id: s.id })
    );
  }

  return recipients;
}

function dedupeRecipients(recipients: Recipient[]): Recipient[] {
  const seen = new Set<string>();
  return recipients.filter((r) => {
    const key = r.email.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ─── Main send function ───────────────────────────────────────────────────────

export async function sendCampaign(campaignId: string): Promise<{ sentCount: number; errors: number }> {
  const campaign = await getCampaignById(campaignId);
  if (!campaign) throw new Error("Campaign not found");

  await updateCampaign(campaignId, { status: "sending" });

  let rawRecipients: Recipient[] = [];
  try {
    if (campaign.targetType === "all") {
      rawRecipients = [
        ...(await getPortalUserRecipients()),
        ...(await getSubscriberRecipients()),
      ];
    } else if (campaign.targetType === "portal_users") {
      rawRecipients = await getPortalUserRecipients();
    } else if (campaign.targetType === "subscribers") {
      rawRecipients = await getSubscriberRecipients();
    } else if (campaign.targetType === "group" && campaign.groupId) {
      rawRecipients = await getGroupRecipients(campaign.groupId);
    }
  } catch (err) {
    await markCampaignFailed(campaignId);
    throw err;
  }

  const recipients = dedupeRecipients(rawRecipients);
  let sentCount = 0;
  let errors = 0;

  for (const recipient of recipients) {
    try {
      const send = await createCampaignSend({
        campaignId,
        recipientEmail: recipient.email,
        recipientName: recipient.name,
        recipientType: recipient.type,
        recipientId: recipient.id,
      });

      const html = buildEmailHtml(campaign.subject, campaign.bodyHtml, send.trackToken);

      await resend.emails.send({
        from: FROM,
        to: recipient.email,
        subject: campaign.subject,
        html,
      });

      sentCount++;
    } catch {
      errors++;
    }
  }

  if (sentCount > 0) {
    await markCampaignSent(campaignId, sentCount);
  } else {
    await markCampaignFailed(campaignId);
  }

  return { sentCount, errors };
}

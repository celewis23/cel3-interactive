import { neon } from "@neondatabase/serverless";
import { randomUUID } from "crypto";

const sql = neon(process.env.DATABASE_URL!);

// ─── Types ────────────────────────────────────────────────────────────────────

export type CampaignStatus = "draft" | "scheduled" | "sending" | "sent" | "failed";
export type TargetType = "all" | "portal_users" | "subscribers" | "group";

export interface Campaign {
  id: string;
  title: string;
  subject: string;
  bodyHtml: string;
  status: CampaignStatus;
  targetType: TargetType;
  groupId: string | null;
  scheduledAt: string | null;
  sentAt: string | null;
  createdAt: string;
  createdByAdminId: string | null;
  sentCount: number;
  openCount: number;
  clickCount: number;
}

export interface Subscriber {
  id: string;
  email: string;
  name: string | null;
  status: "active" | "unsubscribed";
  unsubscribeToken: string;
  createdAt: string;
  unsubscribedAt: string | null;
}

export interface CampaignGroup {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  memberCount?: number;
}

export interface GroupMember {
  groupId: string;
  memberType: "portal_user" | "subscriber";
  memberId: string;
}

export interface CampaignSend {
  id: string;
  campaignId: string;
  recipientEmail: string;
  recipientName: string | null;
  recipientType: "portal_user" | "subscriber";
  recipientId: string;
  trackToken: string;
  sentAt: string;
  openedAt: string | null;
  firstClickedAt: string | null;
}

// ─── Row mappers ──────────────────────────────────────────────────────────────

function rowToCampaign(r: Record<string, unknown>): Campaign {
  return {
    id: r.id as string,
    title: r.title as string,
    subject: r.subject as string,
    bodyHtml: r.body_html as string,
    status: r.status as CampaignStatus,
    targetType: r.target_type as TargetType,
    groupId: (r.group_id as string | null) ?? null,
    scheduledAt: (r.scheduled_at as string | null) ?? null,
    sentAt: (r.sent_at as string | null) ?? null,
    createdAt: r.created_at as string,
    createdByAdminId: (r.created_by_admin_id as string | null) ?? null,
    sentCount: Number(r.sent_count ?? 0),
    openCount: Number(r.open_count ?? 0),
    clickCount: Number(r.click_count ?? 0),
  };
}

function rowToSubscriber(r: Record<string, unknown>): Subscriber {
  return {
    id: r.id as string,
    email: r.email as string,
    name: (r.name as string | null) ?? null,
    status: r.status as "active" | "unsubscribed",
    unsubscribeToken: r.unsubscribe_token as string,
    createdAt: r.created_at as string,
    unsubscribedAt: (r.unsubscribed_at as string | null) ?? null,
  };
}

function rowToGroup(r: Record<string, unknown>): CampaignGroup {
  return {
    id: r.id as string,
    name: r.name as string,
    description: (r.description as string | null) ?? null,
    createdAt: r.created_at as string,
    memberCount: r.member_count !== undefined ? Number(r.member_count) : undefined,
  };
}

// ─── Campaigns ────────────────────────────────────────────────────────────────

export async function listCampaigns(): Promise<Campaign[]> {
  const rows = await sql.query(
    `SELECT * FROM campaigns ORDER BY created_at DESC`
  );
  return rows.map(rowToCampaign);
}

export async function getCampaignById(id: string): Promise<Campaign | null> {
  const rows = await sql.query(
    `SELECT * FROM campaigns WHERE id = $1 LIMIT 1`,
    [id]
  );
  return rows[0] ? rowToCampaign(rows[0]) : null;
}

export async function createCampaign(input: {
  title: string;
  subject: string;
  bodyHtml?: string;
  targetType?: TargetType;
  groupId?: string | null;
  scheduledAt?: string | null;
  createdByAdminId?: string;
}): Promise<Campaign> {
  const id = randomUUID();
  const rows = await sql.query(
    `INSERT INTO campaigns (id, title, subject, body_html, status, target_type, group_id, scheduled_at, created_by_admin_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [
      id,
      input.title,
      input.subject,
      input.bodyHtml ?? "",
      input.scheduledAt ? "scheduled" : "draft",
      input.targetType ?? "all",
      input.groupId ?? null,
      input.scheduledAt ?? null,
      input.createdByAdminId ?? null,
    ]
  );
  return rowToCampaign(rows[0]);
}

export async function updateCampaign(
  id: string,
  input: Partial<Pick<Campaign, "title" | "subject" | "bodyHtml" | "targetType" | "groupId" | "scheduledAt" | "status">>
): Promise<Campaign | null> {
  const fields: string[] = [];
  const values: unknown[] = [];
  let i = 1;
  if (input.title !== undefined) { fields.push(`title = $${i++}`); values.push(input.title); }
  if (input.subject !== undefined) { fields.push(`subject = $${i++}`); values.push(input.subject); }
  if (input.bodyHtml !== undefined) { fields.push(`body_html = $${i++}`); values.push(input.bodyHtml); }
  if (input.targetType !== undefined) { fields.push(`target_type = $${i++}`); values.push(input.targetType); }
  if ("groupId" in input) { fields.push(`group_id = $${i++}`); values.push(input.groupId ?? null); }
  if ("scheduledAt" in input) {
    fields.push(`scheduled_at = $${i++}`); values.push(input.scheduledAt ?? null);
    if (!input.status) { fields.push(`status = $${i++}`); values.push(input.scheduledAt ? "scheduled" : "draft"); }
  }
  if (input.status !== undefined) { fields.push(`status = $${i++}`); values.push(input.status); }
  if (fields.length === 0) return getCampaignById(id);
  values.push(id);
  const rows = await sql.query(
    `UPDATE campaigns SET ${fields.join(", ")} WHERE id = $${i} RETURNING *`,
    values
  );
  return rows[0] ? rowToCampaign(rows[0]) : null;
}

export async function deleteCampaign(id: string): Promise<void> {
  await sql.query(`DELETE FROM campaigns WHERE id = $1`, [id]);
}

export async function markCampaignSent(id: string, sentCount: number): Promise<void> {
  await sql.query(
    `UPDATE campaigns SET status = 'sent', sent_at = now(), sent_count = $1 WHERE id = $2`,
    [sentCount, id]
  );
}

export async function markCampaignFailed(id: string): Promise<void> {
  await sql.query(`UPDATE campaigns SET status = 'failed' WHERE id = $1`, [id]);
}

// Fetch campaigns due to be sent (scheduled and overdue)
export async function getDueCampaigns(): Promise<Campaign[]> {
  const rows = await sql.query(
    `SELECT * FROM campaigns WHERE status = 'scheduled' AND scheduled_at <= now()`
  );
  return rows.map(rowToCampaign);
}

// Recent sent campaigns for portal display
export async function getRecentSentCampaigns(limit = 3): Promise<Campaign[]> {
  const rows = await sql.query(
    `SELECT * FROM campaigns WHERE status = 'sent' ORDER BY sent_at DESC LIMIT $1`,
    [limit]
  );
  return rows.map(rowToCampaign);
}

// ─── Campaign Sends ───────────────────────────────────────────────────────────

export async function createCampaignSend(input: {
  campaignId: string;
  recipientEmail: string;
  recipientName?: string | null;
  recipientType: "portal_user" | "subscriber";
  recipientId: string;
}): Promise<CampaignSend> {
  const id = randomUUID();
  const trackToken = randomUUID().replace(/-/g, "");
  const rows = await sql.query(
    `INSERT INTO campaign_sends (id, campaign_id, recipient_email, recipient_name, recipient_type, recipient_id, track_token)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [id, input.campaignId, input.recipientEmail, input.recipientName ?? null, input.recipientType, input.recipientId, trackToken]
  );
  return rowToSend(rows[0]);
}

function rowToSend(r: Record<string, unknown>): CampaignSend {
  return {
    id: r.id as string,
    campaignId: r.campaign_id as string,
    recipientEmail: r.recipient_email as string,
    recipientName: (r.recipient_name as string | null) ?? null,
    recipientType: r.recipient_type as "portal_user" | "subscriber",
    recipientId: r.recipient_id as string,
    trackToken: r.track_token as string,
    sentAt: r.sent_at as string,
    openedAt: (r.opened_at as string | null) ?? null,
    firstClickedAt: (r.first_clicked_at as string | null) ?? null,
  };
}

export async function getSendByTrackToken(token: string): Promise<CampaignSend | null> {
  const rows = await sql.query(
    `SELECT * FROM campaign_sends WHERE track_token = $1 LIMIT 1`,
    [token]
  );
  return rows[0] ? rowToSend(rows[0]) : null;
}

export async function recordOpen(trackToken: string): Promise<void> {
  await sql.query(
    `UPDATE campaign_sends SET opened_at = now() WHERE track_token = $1 AND opened_at IS NULL`,
    [trackToken]
  );
  // Increment campaign open_count on first open only
  await sql.query(
    `UPDATE campaigns c SET open_count = open_count + 1
     FROM campaign_sends s
     WHERE s.track_token = $1 AND s.campaign_id = c.id
       AND s.opened_at IS NOT NULL`,
    [trackToken]
  );
}

export async function recordClick(trackToken: string, url: string): Promise<void> {
  const send = await getSendByTrackToken(trackToken);
  if (!send) return;
  const clickId = randomUUID();
  await sql.query(
    `INSERT INTO campaign_clicks (id, campaign_send_id, url) VALUES ($1, $2, $3)`,
    [clickId, send.id, url]
  );
  await sql.query(
    `UPDATE campaign_sends SET first_clicked_at = COALESCE(first_clicked_at, now()) WHERE id = $1`,
    [send.id]
  );
  await sql.query(
    `UPDATE campaigns SET click_count = click_count + 1 WHERE id = $1`,
    [send.campaignId]
  );
}

export async function unsubscribeByTrackToken(trackToken: string): Promise<{ type: "subscriber" | "portal_user" } | null> {
  const send = await getSendByTrackToken(trackToken);
  if (!send) return null;
  if (send.recipientType === "subscriber") {
    await sql.query(
      `UPDATE newsletter_subscribers SET status = 'unsubscribed', unsubscribed_at = now() WHERE id = $1`,
      [send.recipientId]
    );
  }
  return { type: send.recipientType };
}

export async function listCampaignSends(campaignId: string): Promise<CampaignSend[]> {
  const rows = await sql.query(
    `SELECT * FROM campaign_sends WHERE campaign_id = $1 ORDER BY sent_at DESC`,
    [campaignId]
  );
  return rows.map(rowToSend);
}

// ─── Subscribers ──────────────────────────────────────────────────────────────

export async function listSubscribers(): Promise<Subscriber[]> {
  const rows = await sql.query(
    `SELECT * FROM newsletter_subscribers ORDER BY created_at DESC`
  );
  return rows.map(rowToSubscriber);
}

export async function listActiveSubscribers(): Promise<Subscriber[]> {
  const rows = await sql.query(
    `SELECT * FROM newsletter_subscribers WHERE status = 'active' ORDER BY email`
  );
  return rows.map(rowToSubscriber);
}

export async function createSubscriber(email: string, name?: string | null): Promise<Subscriber> {
  const id = randomUUID();
  const unsubToken = randomUUID().replace(/-/g, "");
  const rows = await sql.query(
    `INSERT INTO newsletter_subscribers (id, email, name, unsubscribe_token)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
     RETURNING *`,
    [id, email.toLowerCase().trim(), name?.trim() ?? null, unsubToken]
  );
  return rowToSubscriber(rows[0]);
}

export async function updateSubscriberStatus(id: string, status: "active" | "unsubscribed"): Promise<void> {
  await sql.query(
    `UPDATE newsletter_subscribers SET status = $1, unsubscribed_at = CASE WHEN $1 = 'unsubscribed' THEN now() ELSE NULL END WHERE id = $2`,
    [status, id]
  );
}

export async function deleteSubscriber(id: string): Promise<void> {
  await sql.query(`DELETE FROM newsletter_subscribers WHERE id = $1`, [id]);
}

// ─── Groups ───────────────────────────────────────────────────────────────────

export async function listGroups(): Promise<CampaignGroup[]> {
  const rows = await sql.query(
    `SELECT g.*, COUNT(m.member_id) AS member_count
     FROM campaign_groups g
     LEFT JOIN campaign_group_members m ON m.group_id = g.id
     GROUP BY g.id ORDER BY g.created_at DESC`
  );
  return rows.map(rowToGroup);
}

export async function getGroupById(id: string): Promise<CampaignGroup | null> {
  const rows = await sql.query(
    `SELECT g.*, COUNT(m.member_id) AS member_count
     FROM campaign_groups g
     LEFT JOIN campaign_group_members m ON m.group_id = g.id
     WHERE g.id = $1 GROUP BY g.id`,
    [id]
  );
  return rows[0] ? rowToGroup(rows[0]) : null;
}

export async function createGroup(name: string, description?: string | null): Promise<CampaignGroup> {
  const id = randomUUID();
  const rows = await sql.query(
    `INSERT INTO campaign_groups (id, name, description) VALUES ($1, $2, $3) RETURNING *`,
    [id, name, description ?? null]
  );
  return rowToGroup(rows[0]);
}

export async function updateGroup(id: string, name: string, description?: string | null): Promise<void> {
  await sql.query(
    `UPDATE campaign_groups SET name = $1, description = $2 WHERE id = $3`,
    [name, description ?? null, id]
  );
}

export async function deleteGroup(id: string): Promise<void> {
  await sql.query(`DELETE FROM campaign_groups WHERE id = $1`, [id]);
}

export async function listGroupMembers(groupId: string): Promise<GroupMember[]> {
  const rows = await sql.query(
    `SELECT * FROM campaign_group_members WHERE group_id = $1`,
    [groupId]
  );
  return rows.map((r) => ({
    groupId: r.group_id as string,
    memberType: r.member_type as "portal_user" | "subscriber",
    memberId: r.member_id as string,
  }));
}

export async function addGroupMember(groupId: string, memberType: "portal_user" | "subscriber", memberId: string): Promise<void> {
  await sql.query(
    `INSERT INTO campaign_group_members (group_id, member_type, member_id) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
    [groupId, memberType, memberId]
  );
}

export async function removeGroupMember(groupId: string, memberType: string, memberId: string): Promise<void> {
  await sql.query(
    `DELETE FROM campaign_group_members WHERE group_id = $1 AND member_type = $2 AND member_id = $3`,
    [groupId, memberType, memberId]
  );
}

import { randomUUID } from "crypto";
import { sql } from "@/lib/postgres";

export type NewsletterStatus = "draft" | "publishing" | "published" | "sent" | "failed";
export type NewsletterTargetType = "portal_users" | "group";

export interface Newsletter {
  id: string;
  title: string;
  subject: string;
  summary: string | null;
  headerHtml: string;
  bodyHtml: string;
  footerHtml: string;
  status: NewsletterStatus;
  targetType: NewsletterTargetType;
  groupId: string | null;
  primaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  fontFamily: string;
  backgroundImageUrl: string | null;
  videoUrl: string | null;
  sendEmail: boolean;
  publishedAt: string | null;
  emailedAt: string | null;
  createdAt: string;
  updatedAt: string;
  createdByAdminId: string | null;
  portalDeliveryCount: number;
  emailSentCount: number;
  emailErrorCount: number;
}

export interface PortalNewsletter extends Newsletter {
  deliveryId: string;
  deliveredAt: string;
  readAt: string | null;
}

export interface NewsletterEmailSend {
  id: string;
  newsletterId: string;
  portalUserId: string;
  recipientEmail: string;
  recipientName: string | null;
  status: "sent" | "failed";
  error: string | null;
  sentAt: string;
}

export interface NewsletterTemplate {
  id: string;
  name: string;
  description: string | null;
  headerHtml: string;
  bodyHtml: string;
  footerHtml: string;
  primaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  fontFamily: string;
  backgroundImageUrl: string | null;
  videoUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export type NewsletterInput = {
  title: string;
  subject: string;
  summary?: string | null;
  headerHtml?: string;
  bodyHtml?: string;
  footerHtml?: string;
  targetType?: NewsletterTargetType;
  groupId?: string | null;
  primaryColor?: string;
  accentColor?: string;
  backgroundColor?: string;
  textColor?: string;
  fontFamily?: string;
  backgroundImageUrl?: string | null;
  videoUrl?: string | null;
  sendEmail?: boolean;
  createdByAdminId?: string | null;
};

export type NewsletterTemplateInput = {
  name: string;
  description?: string | null;
  headerHtml?: string;
  bodyHtml?: string;
  footerHtml?: string;
  primaryColor?: string;
  accentColor?: string;
  backgroundColor?: string;
  textColor?: string;
  fontFamily?: string;
  backgroundImageUrl?: string | null;
  videoUrl?: string | null;
};

function rowToNewsletter(r: Record<string, unknown>): Newsletter {
  return {
    id: r.id as string,
    title: r.title as string,
    subject: r.subject as string,
    summary: (r.summary as string | null) ?? null,
    headerHtml: r.header_html as string,
    bodyHtml: r.body_html as string,
    footerHtml: r.footer_html as string,
    status: r.status as NewsletterStatus,
    targetType: r.target_type as NewsletterTargetType,
    groupId: (r.group_id as string | null) ?? null,
    primaryColor: r.primary_color as string,
    accentColor: r.accent_color as string,
    backgroundColor: r.background_color as string,
    textColor: r.text_color as string,
    fontFamily: r.font_family as string,
    backgroundImageUrl: (r.background_image_url as string | null) ?? null,
    videoUrl: (r.video_url as string | null) ?? null,
    sendEmail: Boolean(r.send_email),
    publishedAt: (r.published_at as string | null) ?? null,
    emailedAt: (r.emailed_at as string | null) ?? null,
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
    createdByAdminId: (r.created_by_admin_id as string | null) ?? null,
    portalDeliveryCount: Number(r.portal_delivery_count ?? 0),
    emailSentCount: Number(r.email_sent_count ?? 0),
    emailErrorCount: Number(r.email_error_count ?? 0),
  };
}

function rowToTemplate(r: Record<string, unknown>): NewsletterTemplate {
  return {
    id: r.id as string,
    name: r.name as string,
    description: (r.description as string | null) ?? null,
    headerHtml: r.header_html as string,
    bodyHtml: r.body_html as string,
    footerHtml: r.footer_html as string,
    primaryColor: r.primary_color as string,
    accentColor: r.accent_color as string,
    backgroundColor: r.background_color as string,
    textColor: r.text_color as string,
    fontFamily: r.font_family as string,
    backgroundImageUrl: (r.background_image_url as string | null) ?? null,
    videoUrl: (r.video_url as string | null) ?? null,
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
  };
}

function rowToPortalNewsletter(r: Record<string, unknown>): PortalNewsletter {
  return {
    ...rowToNewsletter(r),
    deliveryId: r.delivery_id as string,
    deliveredAt: r.delivered_at as string,
    readAt: (r.read_at as string | null) ?? null,
  };
}

export async function listNewsletters(): Promise<Newsletter[]> {
  const rows = await sql.query<Record<string, unknown>>(
    `SELECT * FROM newsletters ORDER BY created_at DESC`
  );
  return rows.map(rowToNewsletter);
}

export async function getNewsletterById(id: string): Promise<Newsletter | null> {
  const rows = await sql.query<Record<string, unknown>>(
    `SELECT * FROM newsletters WHERE id = $1 LIMIT 1`,
    [id]
  );
  return rows[0] ? rowToNewsletter(rows[0]) : null;
}

export async function createNewsletter(input: NewsletterInput): Promise<Newsletter> {
  const id = randomUUID();
  const rows = await sql.query<Record<string, unknown>>(
    `INSERT INTO newsletters (
      id, title, subject, summary, header_html, body_html, footer_html,
      target_type, group_id, primary_color, accent_color, background_color,
      text_color, font_family, background_image_url, video_url, send_email,
      created_by_admin_id
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
    RETURNING *`,
    [
      id,
      input.title,
      input.subject,
      input.summary ?? null,
      input.headerHtml ?? "",
      input.bodyHtml ?? "",
      input.footerHtml ?? "",
      input.targetType ?? "portal_users",
      input.groupId ?? null,
      input.primaryColor ?? "#0ea5e9",
      input.accentColor ?? "#111827",
      input.backgroundColor ?? "#f8fafc",
      input.textColor ?? "#111827",
      input.fontFamily ?? "Inter, Arial, sans-serif",
      input.backgroundImageUrl ?? null,
      input.videoUrl ?? null,
      input.sendEmail ?? false,
      input.createdByAdminId ?? null,
    ]
  );
  return rowToNewsletter(rows[0]);
}

export async function updateNewsletter(
  id: string,
  input: Partial<Omit<NewsletterInput, "createdByAdminId">> & { status?: NewsletterStatus }
): Promise<Newsletter | null> {
  const fields: string[] = [];
  const values: unknown[] = [];
  let i = 1;

  function set(field: string, value: unknown) {
    fields.push(`${field} = $${i++}`);
    values.push(value);
  }

  if (input.title !== undefined) set("title", input.title);
  if (input.subject !== undefined) set("subject", input.subject);
  if ("summary" in input) set("summary", input.summary ?? null);
  if (input.headerHtml !== undefined) set("header_html", input.headerHtml);
  if (input.bodyHtml !== undefined) set("body_html", input.bodyHtml);
  if (input.footerHtml !== undefined) set("footer_html", input.footerHtml);
  if (input.targetType !== undefined) set("target_type", input.targetType);
  if ("groupId" in input) set("group_id", input.groupId ?? null);
  if (input.primaryColor !== undefined) set("primary_color", input.primaryColor);
  if (input.accentColor !== undefined) set("accent_color", input.accentColor);
  if (input.backgroundColor !== undefined) set("background_color", input.backgroundColor);
  if (input.textColor !== undefined) set("text_color", input.textColor);
  if (input.fontFamily !== undefined) set("font_family", input.fontFamily);
  if ("backgroundImageUrl" in input) set("background_image_url", input.backgroundImageUrl ?? null);
  if ("videoUrl" in input) set("video_url", input.videoUrl ?? null);
  if (input.sendEmail !== undefined) set("send_email", input.sendEmail);
  if (input.status !== undefined) set("status", input.status);

  if (fields.length === 0) return getNewsletterById(id);

  set("updated_at", new Date().toISOString());
  values.push(id);

  const rows = await sql.query<Record<string, unknown>>(
    `UPDATE newsletters SET ${fields.join(", ")} WHERE id = $${i} RETURNING *`,
    values
  );
  return rows[0] ? rowToNewsletter(rows[0]) : null;
}

export async function deleteNewsletter(id: string): Promise<void> {
  await sql.query(`DELETE FROM newsletters WHERE id = $1`, [id]);
}

export async function createPortalDeliveries(newsletterId: string, portalUserIds: string[]): Promise<number> {
  if (portalUserIds.length === 0) return 0;

  const values: unknown[] = [];
  const placeholders = portalUserIds.map((userId, index) => {
    const offset = index * 3;
    const id = randomUUID();
    values.push(id, newsletterId, userId);
    return `($${offset + 1}, $${offset + 2}, $${offset + 3})`;
  });

  const rows = await sql.query<{ id: string }>(
    `INSERT INTO newsletter_portal_deliveries (id, newsletter_id, portal_user_id)
     VALUES ${placeholders.join(", ")}
     ON CONFLICT (newsletter_id, portal_user_id) DO NOTHING
     RETURNING id`,
    values
  );
  return rows.length;
}

export async function markNewsletterPublished(
  id: string,
  deliveryCount: number,
  sendEmail: boolean
): Promise<void> {
  await sql.query(
    `UPDATE newsletters
     SET status = $1,
         published_at = COALESCE(published_at, now()),
         portal_delivery_count = $2,
         send_email = $3,
         updated_at = now()
     WHERE id = $4`,
    [sendEmail ? "sent" : "published", deliveryCount, sendEmail, id]
  );
}

export async function markNewsletterEmailResults(id: string, sentCount: number, errorCount: number): Promise<void> {
  await sql.query(
    `UPDATE newsletters
     SET emailed_at = CASE WHEN $1 > 0 THEN now() ELSE emailed_at END,
         email_sent_count = $1,
         email_error_count = $2,
         status = CASE WHEN $1 > 0 THEN 'sent' ELSE 'failed' END,
         updated_at = now()
     WHERE id = $3`,
    [sentCount, errorCount, id]
  );
}

export async function markNewsletterFailed(id: string): Promise<void> {
  await sql.query(`UPDATE newsletters SET status = 'failed', updated_at = now() WHERE id = $1`, [id]);
}

export async function recordNewsletterEmailSend(input: {
  newsletterId: string;
  portalUserId: string;
  recipientEmail: string;
  recipientName?: string | null;
  status: "sent" | "failed";
  error?: string | null;
}): Promise<NewsletterEmailSend> {
  const rows = await sql.query<Record<string, unknown>>(
    `INSERT INTO newsletter_email_sends (
      id, newsletter_id, portal_user_id, recipient_email, recipient_name, status, error
    ) VALUES ($1,$2,$3,$4,$5,$6,$7)
    RETURNING *`,
    [
      randomUUID(),
      input.newsletterId,
      input.portalUserId,
      input.recipientEmail,
      input.recipientName ?? null,
      input.status,
      input.error ?? null,
    ]
  );
  const row = rows[0];
  return {
    id: row.id as string,
    newsletterId: row.newsletter_id as string,
    portalUserId: row.portal_user_id as string,
    recipientEmail: row.recipient_email as string,
    recipientName: (row.recipient_name as string | null) ?? null,
    status: row.status as "sent" | "failed",
    error: (row.error as string | null) ?? null,
    sentAt: row.sent_at as string,
  };
}

export async function listPortalNewsletters(userId: string, limit = 20): Promise<PortalNewsletter[]> {
  const rows = await sql.query<Record<string, unknown>>(
    `SELECT n.*, d.id AS delivery_id, d.delivered_at, d.read_at
     FROM newsletter_portal_deliveries d
     JOIN newsletters n ON n.id = d.newsletter_id
     WHERE d.portal_user_id = $1 AND n.status IN ('published', 'sent')
     ORDER BY d.delivered_at DESC
     LIMIT $2`,
    [userId, limit]
  );
  return rows.map(rowToPortalNewsletter);
}

export async function getPortalNewsletter(userId: string, newsletterId: string): Promise<PortalNewsletter | null> {
  const rows = await sql.query<Record<string, unknown>>(
    `SELECT n.*, d.id AS delivery_id, d.delivered_at, d.read_at
     FROM newsletter_portal_deliveries d
     JOIN newsletters n ON n.id = d.newsletter_id
     WHERE d.portal_user_id = $1 AND d.newsletter_id = $2 AND n.status IN ('published', 'sent')
     LIMIT 1`,
    [userId, newsletterId]
  );
  return rows[0] ? rowToPortalNewsletter(rows[0]) : null;
}

export async function markPortalNewsletterRead(userId: string, newsletterId: string): Promise<void> {
  await sql.query(
    `UPDATE newsletter_portal_deliveries
     SET read_at = COALESCE(read_at, now())
     WHERE portal_user_id = $1 AND newsletter_id = $2`,
    [userId, newsletterId]
  );
}

export async function listNewsletterTemplates(): Promise<NewsletterTemplate[]> {
  const rows = await sql.query<Record<string, unknown>>(
    `SELECT * FROM newsletter_templates ORDER BY updated_at DESC, name ASC`
  );
  return rows.map(rowToTemplate);
}

export async function getNewsletterTemplateById(id: string): Promise<NewsletterTemplate | null> {
  const rows = await sql.query<Record<string, unknown>>(
    `SELECT * FROM newsletter_templates WHERE id = $1 LIMIT 1`,
    [id]
  );
  return rows[0] ? rowToTemplate(rows[0]) : null;
}

export async function createNewsletterTemplate(input: NewsletterTemplateInput): Promise<NewsletterTemplate> {
  const rows = await sql.query<Record<string, unknown>>(
    `INSERT INTO newsletter_templates (
      id, name, description, header_html, body_html, footer_html,
      primary_color, accent_color, background_color, text_color, font_family,
      background_image_url, video_url
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
    RETURNING *`,
    [
      randomUUID(),
      input.name,
      input.description ?? null,
      input.headerHtml ?? "",
      input.bodyHtml ?? "",
      input.footerHtml ?? "",
      input.primaryColor ?? "#0ea5e9",
      input.accentColor ?? "#111827",
      input.backgroundColor ?? "#f8fafc",
      input.textColor ?? "#111827",
      input.fontFamily ?? "Inter, Arial, sans-serif",
      input.backgroundImageUrl ?? null,
      input.videoUrl ?? null,
    ]
  );
  return rowToTemplate(rows[0]);
}

export async function updateNewsletterTemplate(
  id: string,
  input: NewsletterTemplateInput
): Promise<NewsletterTemplate | null> {
  const rows = await sql.query<Record<string, unknown>>(
    `UPDATE newsletter_templates
     SET name = $1,
         description = $2,
         header_html = $3,
         body_html = $4,
         footer_html = $5,
         primary_color = $6,
         accent_color = $7,
         background_color = $8,
         text_color = $9,
         font_family = $10,
         background_image_url = $11,
         video_url = $12,
         updated_at = now()
     WHERE id = $13
     RETURNING *`,
    [
      input.name,
      input.description ?? null,
      input.headerHtml ?? "",
      input.bodyHtml ?? "",
      input.footerHtml ?? "",
      input.primaryColor ?? "#0ea5e9",
      input.accentColor ?? "#111827",
      input.backgroundColor ?? "#f8fafc",
      input.textColor ?? "#111827",
      input.fontFamily ?? "Inter, Arial, sans-serif",
      input.backgroundImageUrl ?? null,
      input.videoUrl ?? null,
      id,
    ]
  );
  return rows[0] ? rowToTemplate(rows[0]) : null;
}

export async function deleteNewsletterTemplate(id: string): Promise<void> {
  await sql.query(`DELETE FROM newsletter_templates WHERE id = $1`, [id]);
}

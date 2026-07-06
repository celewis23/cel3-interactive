import { randomUUID } from "crypto";
import { sql } from "@/lib/postgres";
import { sendPushNotificationToClient } from "@/lib/notifications/push";

type PortalNotificationInput = {
  userId: string;
  title: string;
  body: string;
  entityType?: string;
  entityId: string;
  linkUrl: string;
  pushTag?: string;
};

export async function createPortalNotification(input: PortalNotificationInput) {
  const now = new Date().toISOString();
  await sql.query(
    `INSERT INTO messaging_notifications (
      id, recipient_actor_id, recipient_user_id, recipient_kind, type, title,
      body, entity_type, entity_id, is_read, created_at, link_url
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
    [
      randomUUID(),
      `portal:${input.userId}`,
      input.userId,
      "client",
      "PortalUpdate",
      input.title,
      input.body.slice(0, 180),
      input.entityType ?? "Portal",
      input.entityId,
      false,
      now,
      input.linkUrl,
    ]
  );

  await sendPushNotificationToClient(input.userId, {
    title: input.title,
    body: input.body.slice(0, 140),
    href: input.linkUrl,
    tag: input.pushTag ?? `${input.entityType ?? "portal"}:${input.entityId}:${now}`,
  }).catch((err) => console.error("PORTAL_PUSH_ERR:", err));
}

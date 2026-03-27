import { createHash } from "crypto";
import webpush, { PushSubscription } from "web-push";
import { sanityServer } from "@/lib/sanityServer";
import { sanityWriteClient } from "@/lib/sanity.write";

type SessionTarget =
  | { isOwner: true; staffId: null; roleSlug: "owner" }
  | { isOwner: false; staffId: string; roleSlug: string };

type StoredSubscription = {
  _id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  staffId: string | null;
  roleSlug: string;
  isOwner: boolean;
};

type PushPayload = {
  title: string;
  body: string;
  href: string;
  tag?: string;
};

const VAPID_DOC_ID = "web-push-vapid-keys";

function notificationEmail() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.cel3interactive.com";
  const hostname = new URL(siteUrl).hostname;
  return `mailto:notifications@${hostname}`;
}

async function ensureVapidKeys() {
  const envPublicKey = process.env.WEB_PUSH_PUBLIC_KEY;
  const envPrivateKey = process.env.WEB_PUSH_PRIVATE_KEY;

  if (envPublicKey && envPrivateKey) {
    return { publicKey: envPublicKey, privateKey: envPrivateKey };
  }

  const existing = await sanityServer
    .getDocument<{ publicKey: string; privateKey: string }>(VAPID_DOC_ID)
    .catch(() => null);

  if (existing?.publicKey && existing?.privateKey) {
    return existing;
  }

  const generated = webpush.generateVAPIDKeys();
  await sanityWriteClient.createOrReplace({
    _id: VAPID_DOC_ID,
    _type: "notificationState",
    publicKey: generated.publicKey,
    privateKey: generated.privateKey,
  });
  return generated;
}

async function configureWebPush() {
  const keys = await ensureVapidKeys();
  webpush.setVapidDetails(notificationEmail(), keys.publicKey, keys.privateKey);
  return keys;
}

function subscriptionDocId(endpoint: string) {
  const hash = createHash("sha256").update(endpoint).digest("hex");
  return `webPushSubscription_${hash.slice(0, 40)}`;
}

function serializeSubscription(subscription: PushSubscription) {
  return {
    endpoint: subscription.endpoint,
    keys: {
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
    },
  };
}

async function getRolePermissions(roleSlugs: string[]) {
  if (roleSlugs.length === 0) return {} as Record<string, Record<string, Record<string, boolean>>>;

  const roles = await sanityServer.fetch<Array<{ slug: string; permissions: Record<string, Record<string, boolean>> }>>(
    `*[_type == "staffRole" && slug in $slugs]{ slug, permissions }`,
    { slugs: roleSlugs }
  );

  return Object.fromEntries(roles.map((role) => [role.slug, role.permissions]));
}

function canReceive(
  subscription: StoredSubscription,
  rolePermissions: Record<string, Record<string, Record<string, boolean>>>,
  module?: string,
  action = "view"
) {
  if (subscription.isOwner) return true;
  if (!module) return true;
  return !!rolePermissions[subscription.roleSlug]?.[module]?.[action];
}

export async function getWebPushPublicKey() {
  const keys = await configureWebPush();
  return keys.publicKey;
}

export async function upsertPushSubscription(target: SessionTarget, subscription: PushSubscription) {
  await configureWebPush();

  const serialized = serializeSubscription(subscription);
  const now = new Date().toISOString();

  await sanityWriteClient.createOrReplace({
    _id: subscriptionDocId(serialized.endpoint),
    _type: "webPushSubscription",
    endpoint: serialized.endpoint,
    p256dh: serialized.keys.p256dh,
    auth: serialized.keys.auth,
    staffId: target.staffId,
    roleSlug: target.roleSlug,
    isOwner: target.isOwner,
    createdAt: now,
    updatedAt: now,
  });
}

export async function removePushSubscription(endpoint: string) {
  try {
    await sanityWriteClient.delete(subscriptionDocId(endpoint));
  } catch {
    // ignore missing records
  }
}

export async function sendPushNotificationToAudience(
  payload: PushPayload,
  opts?: { module?: string; action?: string }
) {
  await configureWebPush();

  const subscriptions = await sanityServer.fetch<StoredSubscription[]>(
    `*[_type == "webPushSubscription"]{
      _id, endpoint, p256dh, auth, staffId, roleSlug, isOwner
    }`
  );

  if (subscriptions.length === 0) return { sent: 0 };

  const rolePermissions = await getRolePermissions(
    Array.from(new Set(subscriptions.filter((item) => !item.isOwner).map((item) => item.roleSlug)))
  );

  let sent = 0;

  await Promise.all(
    subscriptions.map(async (subscription) => {
      if (!canReceive(subscription, rolePermissions, opts?.module, opts?.action)) {
        return;
      }

      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.p256dh,
              auth: subscription.auth,
            },
          },
          JSON.stringify(payload),
          { urgency: "high" }
        );
        sent += 1;
      } catch (err) {
        const statusCode = typeof err === "object" && err !== null && "statusCode" in err
          ? Number((err as { statusCode?: number }).statusCode)
          : null;
        if (statusCode === 404 || statusCode === 410) {
          await removePushSubscription(subscription.endpoint);
          return;
        }
        console.error("WEB_PUSH_SEND_ERR:", err);
      }
    })
  );

  return { sent };
}

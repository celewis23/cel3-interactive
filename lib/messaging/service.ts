import { randomUUID } from "crypto";
import { NextRequest } from "next/server";
import { sanityServer } from "@/lib/sanityServer";
import { sanityWriteClient } from "@/lib/sanity.write";
import { sendPushNotificationToAudience } from "@/lib/notifications/push";
import { MessagingActor } from "@/lib/messaging/auth";
import { logAudit } from "@/lib/audit/log";
import { createFolder, listFiles, uploadFile } from "@/lib/google/drive";

const MAX_MESSAGE_LENGTH = 5000;
const MAX_ATTACHMENT_BYTES = 50 * 1024 * 1024;
const MAX_ATTACHMENTS_PER_MESSAGE = 8;

const ALLOWED_ATTACHMENT_TYPES = new Set([
  "image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml", "image/avif",
  "audio/mpeg", "audio/mp3", "audio/wav", "audio/x-wav", "audio/mp4", "audio/aac", "audio/ogg", "audio/webm", "audio/x-m4a",
  "video/mp4", "video/webm", "video/quicktime",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/zip", "application/x-zip-compressed",
  "text/plain", "text/csv",
]);

export type ConversationSummary = {
  _id: string;
  title: string | null;
  status: string;
  type: string;
  clientId: string | null;
  clientName: string | null;
  clientEmail: string | null;
  company: string | null;
  createdAt: string;
  updatedAt: string;
  lastMessageAt: string;
  lastMessagePreview: string | null;
  lastSenderName: string | null;
  unreadCount: number;
  participantCount: number;
};

export type MessageRecord = {
  _id: string;
  conversationId: string;
  senderActorId: string;
  senderUserId: string | null;
  senderKind: "admin" | "client" | "system";
  senderName: string;
  senderEmail: string | null;
  senderAvatarUrl: string | null;
  body: string;
  messageType: string;
  createdAt: string;
  updatedAt: string | null;
  deletedAt: string | null;
  attachments: MessageAttachment[];
};

export type MessageAttachment = {
  _key: string;
  driveFileId: string;
  fileName: string;
  fileUrl: string | null;
  webViewLink: string | null;
  webContentLink: string | null;
  thumbnailLink: string | null;
  contentType: string;
  size: number | null;
  uploadedByActorId: string;
  uploadedByUserId: string | null;
  createdAt: string;
};

type ConversationRecord = ConversationSummary & {
  participants: Array<{
    _key: string;
    actorId: string;
    userId: string | null;
    participantKind: "admin" | "client";
    roleInConversation: string;
    displayName: string;
    email: string | null;
    joinedAt: string;
    lastReadMessageId: string | null;
    lastReadAt: string | null;
    isMuted: boolean;
    isArchived: boolean;
  }>;
};

export type MessageablePortalUser = {
  _id: string;
  email: string;
  name: string | null;
  company: string | null;
  profileImageUrl: string | null;
  stripeCustomerId: string | null;
  pipelineContactId: string | null;
  driveRootFolderId: string | null;
  status: string;
};

export type MessageAttachmentInput = {
  fileName: string;
  contentType: string;
  size: number;
  data: Buffer;
};

function normalizeBody(body: unknown) {
  return String(body ?? "").replace(/\r\n/g, "\n").trim();
}

export function validateMessageBody(body: unknown, opts?: { allowEmpty?: boolean }) {
  const value = normalizeBody(body);
  if (!value && !opts?.allowEmpty) return { ok: false as const, error: "Message body is required" };
  if (value.length > MAX_MESSAGE_LENGTH) {
    return { ok: false as const, error: `Message body must be ${MAX_MESSAGE_LENGTH} characters or less` };
  }
  return { ok: true as const, body: value };
}

function validateAttachments(attachments: MessageAttachmentInput[]) {
  if (attachments.length > MAX_ATTACHMENTS_PER_MESSAGE) {
    return { ok: false as const, error: `Attach ${MAX_ATTACHMENTS_PER_MESSAGE} files or fewer per message` };
  }

  for (const attachment of attachments) {
    if (!attachment.fileName || attachment.size <= 0) return { ok: false as const, error: "Attached files cannot be empty" };
    if (attachment.size > MAX_ATTACHMENT_BYTES) return { ok: false as const, error: `${attachment.fileName} is too large. Max file size is 50 MB` };
    if (!ALLOWED_ATTACHMENT_TYPES.has(attachment.contentType)) {
      return { ok: false as const, error: `File type not allowed: ${attachment.contentType || "unknown"}` };
    }
  }

  return { ok: true as const };
}

function sanitizeDriveFolderName(input: string) {
  const cleaned = input.replace(/[<>:"/\\|?*\u0000-\u001F]/g, " ").replace(/\s+/g, " ").trim();
  return cleaned || "Conversation";
}

async function getOrCreateDriveFolderByName(name: string, parentId?: string | null) {
  const normalized = sanitizeDriveFolderName(name);
  const { files } = await listFiles({ folderId: parentId ?? undefined, foldersOnly: true, pageSize: 200 });
  const existing = files.find((file) => file.isFolder && file.name.trim().toLowerCase() === normalized.toLowerCase());
  if (existing) return existing;
  return createFolder(normalized, parentId ?? undefined);
}

function guessAssetFileType(mime: string) {
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("audio/")) return "audio";
  if (mime.startsWith("video/")) return "video";
  if (mime === "application/pdf") return "pdf";
  if (mime.includes("zip")) return "zip";
  if (mime.includes("word") || mime.includes("document")) return "doc";
  if (mime.includes("sheet") || mime.includes("excel") || mime === "text/csv") return "spreadsheet";
  if (mime.includes("presentation") || mime.includes("powerpoint")) return "presentation";
  if (mime.startsWith("text/")) return "text";
  return "other";
}

function makeParticipant(actor: MessagingActor, now: string, roleInConversation?: string) {
  return {
    _key: randomUUID(),
    actorId: actor.actorId,
    userId: actor.userId,
    participantKind: actor.kind,
    roleInConversation: roleInConversation ?? (actor.kind === "admin" ? "Admin" : "Client"),
    displayName: actor.name,
    email: actor.email,
    joinedAt: now,
    lastReadMessageId: null,
    lastReadAt: null,
    isMuted: false,
    isArchived: false,
  };
}

async function fetchConversation(conversationId: string) {
  return sanityServer.fetch<ConversationRecord | null>(
    `*[_type == "messagingConversation" && _id == $id][0]{
      _id, title, status, type, clientId, clientName, clientEmail, company,
      createdAt, updatedAt, lastMessageAt, lastMessagePreview, lastSenderName,
      "unreadCount": 0,
      "participantCount": count(participants),
      participants
    }`,
    { id: conversationId }
  );
}

function actorCanAccessConversation(actor: MessagingActor, conversation: ConversationRecord | null) {
  if (!conversation) return false;
  if (actor.kind === "admin") return true;
  return conversation.clientId === actor.userId || conversation.participants?.some((p) => p.actorId === actor.actorId);
}

function unreadCountFor(actor: MessagingActor, conversation: ConversationRecord, messages: MessageRecord[]) {
  const participant = conversation.participants?.find((p) => p.actorId === actor.actorId);
  const lastReadAt = participant?.lastReadAt ? new Date(participant.lastReadAt).getTime() : 0;
  return messages.filter((message) => {
    if (message.deletedAt) return false;
    if (message.senderActorId === actor.actorId) return false;
    return new Date(message.createdAt).getTime() > lastReadAt;
  }).length;
}

export async function listConversations(actor: MessagingActor, search?: string): Promise<ConversationSummary[]> {
  const filter = actor.kind === "admin"
    ? `_type == "messagingConversation"`
    : `_type == "messagingConversation" && (clientId == $clientId || $actorId in participants[].actorId)`;

  const conversations = await sanityServer.fetch<ConversationRecord[]>(
    `*[${filter}] | order(lastMessageAt desc, updatedAt desc)[0...100]{
      _id, title, status, type, clientId, clientName, clientEmail, company,
      createdAt, updatedAt, lastMessageAt, lastMessagePreview, lastSenderName,
      "unreadCount": 0,
      "participantCount": count(participants),
      participants
    }`,
    { clientId: actor.kind === "client" ? actor.userId : null, actorId: actor.actorId }
  );

  const query = search?.trim().toLowerCase();
  const filtered = query
    ? conversations.filter((item) =>
        [item.title, item.clientName, item.clientEmail, item.company, item.lastMessagePreview]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query))
      )
    : conversations;

  const messageGroups = filtered.length
    ? await sanityServer.fetch<Array<{ conversationId: string; messages: MessageRecord[] }>>(
        `*[_type == "messagingConversation" && _id in $ids]{
          _id,
          "conversationId": _id,
          "messages": *[_type == "messagingMessage" && conversationId == ^._id && deletedAt == null] | order(createdAt asc){
            _id, conversationId, senderActorId, senderUserId, senderKind, senderName, senderEmail,
            senderAvatarUrl, body, messageType, createdAt, updatedAt, deletedAt,
            "attachments": coalesce(attachments, [])
          }
        }`,
        { ids: filtered.map((item) => item._id) }
      )
    : [];

  const byId = new Map(messageGroups.map((group) => [group.conversationId, group.messages]));
  return filtered.map((conversation) => ({
    ...conversation,
    unreadCount: unreadCountFor(actor, conversation, byId.get(conversation._id) ?? []),
  }));
}

export async function getConversation(actor: MessagingActor, conversationId: string) {
  const conversation = await fetchConversation(conversationId);
  if (!actorCanAccessConversation(actor, conversation)) return null;

  const messages = await sanityServer.fetch<MessageRecord[]>(
    `*[_type == "messagingMessage" && conversationId == $conversationId && deletedAt == null] | order(createdAt asc){
      _id, conversationId, senderActorId, senderUserId, senderKind, senderName, senderEmail,
      senderAvatarUrl, body, messageType, createdAt, updatedAt, deletedAt,
      "attachments": coalesce(attachments, [])
    }`,
    { conversationId }
  );

  return {
    conversation: {
      ...conversation!,
      unreadCount: unreadCountFor(actor, conversation!, messages),
    },
    messages,
  };
}

export async function listMessageablePortalUsers(actor: MessagingActor, search?: string) {
  if (actor.kind !== "admin") return [];

  const query = search?.trim().toLowerCase();
  const users = await sanityServer.fetch<MessageablePortalUser[]>(
    `*[_type == "clientPortalUser" && status != "suspended"] | order(coalesce(company, name, email) asc){
      _id, email, name, company, profileImageUrl, stripeCustomerId, pipelineContactId, driveRootFolderId, status
    }`
  );

  if (!query) return users;
  return users.filter((user) =>
    [user.name, user.company, user.email]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(query))
  );
}

export async function startConversation(actor: MessagingActor, input: { title?: unknown; body?: unknown }, req?: NextRequest) {
  if (actor.kind !== "client") throw new Error("Only portal users can start client conversations");

  const validation = validateMessageBody(input.body);
  if (!validation.ok) return { error: validation.error };

  const now = new Date().toISOString();
  const title = String(input.title ?? "").trim().slice(0, 120) || "Client message";
  const clientParticipant = makeParticipant(actor, now, "Client");

  const conversation = await sanityWriteClient.create({
    _type: "messagingConversation",
    title,
    status: "open",
    type: "ClientSupport",
    clientId: actor.userId,
    clientName: actor.name,
    clientEmail: actor.email,
    company: actor.company,
    stripeCustomerId: actor.stripeCustomerId,
    pipelineContactId: actor.pipelineContactId,
    createdByActorId: actor.actorId,
    createdByUserId: actor.userId,
    createdAt: now,
    updatedAt: now,
    lastMessageAt: now,
    lastMessagePreview: validation.body.slice(0, 180),
    lastSenderName: actor.name,
    participants: [clientParticipant],
  });

  const message = await createMessageDocument(conversation._id, actor, validation.body, now);
  await notifyAdminsForClientMessage(conversation._id, title, actor, validation.body);

  if (req) {
    logAudit(req, {
      action: "messaging.conversation_created",
      resourceType: "messagingConversation",
      resourceId: conversation._id,
      resourceLabel: title,
      description: `${actor.name} started a client conversation`,
    }, { userId: actor.userId, userName: actor.name, userEmail: actor.email, isOwner: false });
  }

  return { conversation, message };
}

export async function startAdminConversation(
  actor: MessagingActor,
  input: { title?: unknown; body?: unknown; portalUserId?: unknown },
  req?: NextRequest
) {
  if (actor.kind !== "admin") return { error: "Only admin users can start client conversations", status: 403 };

  const portalUserId = String(input.portalUserId ?? "").trim();
  if (!portalUserId) return { error: "portalUserId is required", status: 400 };

  const validation = validateMessageBody(input.body);
  if (!validation.ok) return { error: validation.error, status: 400 };

  const client = await sanityServer.fetch<MessageablePortalUser | null>(
    `*[_type == "clientPortalUser" && _id == $id && status != "suspended"][0]{
      _id, email, name, company, profileImageUrl, stripeCustomerId, pipelineContactId, driveRootFolderId, status
    }`,
    { id: portalUserId }
  );
  if (!client) return { error: "Portal user not found", status: 404 };

  const now = new Date().toISOString();
  const clientName = client.name ?? client.company ?? client.email;
  const title = String(input.title ?? "").trim().slice(0, 120) || `Message for ${clientName}`;
  const clientActor: MessagingActor = {
    kind: "client",
    actorId: `portal:${client._id}`,
    userId: client._id,
    name: clientName,
    email: client.email,
    company: client.company,
    stripeCustomerId: client.stripeCustomerId,
    pipelineContactId: client.pipelineContactId,
    avatarUrl: client.profileImageUrl ?? null,
  };

  const adminParticipant = {
    ...makeParticipant(actor, now, "Admin"),
    lastReadAt: now,
  };
  const clientParticipant = makeParticipant(clientActor, now, "Client");

  const conversation = await sanityWriteClient.create({
    _type: "messagingConversation",
    title,
    status: "open",
    type: "ClientSupport",
    clientId: client._id,
    clientName,
    clientEmail: client.email,
    company: client.company,
    stripeCustomerId: client.stripeCustomerId,
    pipelineContactId: client.pipelineContactId,
    createdByActorId: actor.actorId,
    createdByUserId: actor.userId,
    createdAt: now,
    updatedAt: now,
    lastMessageAt: now,
    lastMessagePreview: validation.body.slice(0, 180),
    lastSenderName: actor.name,
    participants: [adminParticipant, clientParticipant],
  });

  const message = await createMessageDocument(conversation._id, actor, validation.body, now);
  await notifyClientForAdminMessage({
    _id: conversation._id,
    title,
    status: "open",
    type: "ClientSupport",
    clientId: client._id,
    clientName,
    clientEmail: client.email,
    company: client.company,
    createdAt: now,
    updatedAt: now,
    lastMessageAt: now,
    lastMessagePreview: validation.body.slice(0, 180),
    lastSenderName: actor.name,
    unreadCount: 0,
    participantCount: 2,
    participants: [adminParticipant, clientParticipant],
  }, actor, validation.body);

  if (req) {
    logAudit(req, {
      action: "messaging.conversation_created",
      resourceType: "messagingConversation",
      resourceId: conversation._id,
      resourceLabel: title,
      description: `${actor.name} started a client conversation with ${clientName}`,
    });
  }

  return { conversation, message, status: 201 };
}

async function uploadConversationAttachments(
  conversation: ConversationRecord,
  actor: MessagingActor,
  files: MessageAttachmentInput[],
  now: string
): Promise<{ attachments?: MessageAttachment[]; error?: string; status?: number }> {
  if (files.length === 0) return { attachments: [] };

  const validation = validateAttachments(files);
  if (!validation.ok) return { error: validation.error, status: 400 };

  if (!conversation.clientId) return { error: "Conversation is not linked to a client account", status: 422 };

  const client = await sanityServer.fetch<{ _id: string; driveRootFolderId: string | null } | null>(
    `*[_type == "clientPortalUser" && _id == $id][0]{ _id, driveRootFolderId }`,
    { id: conversation.clientId }
  );

  if (!client?.driveRootFolderId) {
    return { error: "No Drive folder configured for this client", status: 422 };
  }

  const messagesFolder = await getOrCreateDriveFolderByName("Messages", client.driveRootFolderId);
  const folderLabel = conversation.title || conversation.clientName || conversation.clientEmail || conversation._id;
  const conversationFolder = await getOrCreateDriveFolderByName(folderLabel, messagesFolder.id);

  const attachments: MessageAttachment[] = [];
  for (const file of files) {
    const uploaded = await uploadFile({
      name: file.fileName,
      mimeType: file.contentType,
      data: file.data,
      parentId: conversationFolder.id,
    });

    const attachment: MessageAttachment = {
      _key: uploaded.id || randomUUID(),
      driveFileId: uploaded.id,
      fileName: uploaded.name || file.fileName,
      fileUrl: uploaded.webViewLink ?? uploaded.webContentLink ?? null,
      webViewLink: uploaded.webViewLink ?? null,
      webContentLink: uploaded.webContentLink ?? null,
      thumbnailLink: uploaded.thumbnailLink ?? null,
      contentType: uploaded.mimeType || file.contentType,
      size: uploaded.size ?? file.size ?? null,
      uploadedByActorId: actor.actorId,
      uploadedByUserId: actor.userId,
      createdAt: now,
    };

    attachments.push(attachment);

    await sanityWriteClient.create({
      _type: "assetItem",
      name: attachment.fileName,
      fileUrl: attachment.fileUrl,
      fileType: guessAssetFileType(attachment.contentType),
      mimeType: attachment.contentType,
      sizeBytes: attachment.size,
      folderId: null,
      tags: ["messaging"],
      linkedEntityType: "messagingConversation",
      linkedEntityId: conversation._id,
      uploadedBy: actor.userId,
      isPublic: false,
      publicToken: null,
      publicExpiresAt: null,
      sourceRef: {
        source: "googleDrive",
        driveFileId: attachment.driveFileId,
        driveFolderId: conversationFolder.id,
        conversationId: conversation._id,
      },
      sanityAssetId: null,
      createdAt: now,
    });
  }

  await sanityWriteClient.patch(conversation._id).set({ driveFolderId: conversationFolder.id }).commit();
  return { attachments };
}

async function createMessageDocument(
  conversationId: string,
  actor: MessagingActor,
  body: string,
  now = new Date().toISOString(),
  attachments: MessageAttachment[] = []
) {
  return sanityWriteClient.create({
    _type: "messagingMessage",
    conversationId,
    senderActorId: actor.actorId,
    senderUserId: actor.userId,
    senderKind: actor.kind,
    senderName: actor.name,
    senderEmail: actor.email,
    senderAvatarUrl: actor.avatarUrl,
    body,
    messageType: attachments.length > 0 && !body ? "Attachment" : "Text",
    attachments,
    metadata: null,
    createdAt: now,
    updatedAt: null,
    deletedAt: null,
  });
}

export async function sendConversationMessage(
  actor: MessagingActor,
  conversationId: string,
  bodyInput: unknown,
  req?: NextRequest,
  attachmentInputs: MessageAttachmentInput[] = []
) {
  const conversation = await fetchConversation(conversationId);
  if (!actorCanAccessConversation(actor, conversation)) {
    return { error: "Conversation not found", status: 404 };
  }

  const now = new Date().toISOString();
  const uploadResult = await uploadConversationAttachments(conversation!, actor, attachmentInputs, now);
  if (uploadResult.error) return { error: uploadResult.error, status: uploadResult.status ?? 400 };

  const attachments = uploadResult.attachments ?? [];
  const validation = validateMessageBody(bodyInput, { allowEmpty: attachments.length > 0 });
  if (!validation.ok) return { error: validation.error, status: 400 };

  const preview = validation.body || (attachments.length === 1 ? `Sent ${attachments[0].fileName}` : `Sent ${attachments.length} attachments`);
  const message = await createMessageDocument(conversationId, actor, validation.body, now, attachments);

  const patches: Record<string, unknown> = {
    updatedAt: now,
    lastMessageAt: now,
    lastMessagePreview: preview.slice(0, 180),
    lastSenderName: actor.name,
  };

  const hasParticipant = conversation!.participants?.some((participant) => participant.actorId === actor.actorId);
  const patch = sanityWriteClient.patch(conversationId).set(patches);
  if (!hasParticipant) patch.append("participants", [makeParticipant(actor, now)]);
  await patch.commit();

  if (actor.kind === "client") {
    await notifyAdminsForClientMessage(conversationId, conversation!.title ?? "Client message", actor, preview);
  } else {
    await notifyClientForAdminMessage(conversation!, actor, preview);
  }

  if (req) {
    logAudit(req, {
      action: "messaging.message_created",
      resourceType: "messagingConversation",
      resourceId: conversationId,
      resourceLabel: conversation!.title,
      description: `${actor.name} sent a message`,
    });
  }

  return { message, status: 201 };
}

export async function markConversationRead(actor: MessagingActor, conversationId: string) {
  const conversation = await fetchConversation(conversationId);
  if (!actorCanAccessConversation(actor, conversation)) return { error: "Conversation not found", status: 404 };

  const latest = await sanityServer.fetch<{ _id: string; createdAt: string } | null>(
    `*[_type == "messagingMessage" && conversationId == $conversationId && deletedAt == null] | order(createdAt desc)[0]{
      _id, createdAt
    }`,
    { conversationId }
  );

  const now = new Date().toISOString();
  const participant = conversation!.participants?.find((item) => item.actorId === actor.actorId);
  if (participant?._key) {
    await sanityWriteClient
      .patch(conversationId)
      .set({
        [`participants[_key=="${participant._key}"].lastReadAt`]: now,
        [`participants[_key=="${participant._key}"].lastReadMessageId`]: latest?._id ?? null,
      })
      .commit();
  } else {
    await sanityWriteClient.patch(conversationId).append("participants", [{
      ...makeParticipant(actor, now),
      lastReadAt: now,
      lastReadMessageId: latest?._id ?? null,
    }]).commit();
  }

  await markNotificationsRead(actor, conversationId);
  return { ok: true };
}

export async function getUnreadCount(actor: MessagingActor) {
  const conversations = await listConversations(actor);
  return conversations.reduce((sum, item) => sum + item.unreadCount, 0);
}

export async function listNotifications(actor: MessagingActor) {
  return sanityServer.fetch(
    `*[_type == "messagingNotification" && recipientActorId == $actorId] | order(createdAt desc)[0...50]{
      _id, type, title, body, entityType, entityId, isRead, createdAt, linkUrl
    }`,
    { actorId: actor.actorId }
  );
}

export async function markNotificationRead(actor: MessagingActor, notificationId: string) {
  const notification = await sanityServer.fetch<{ _id: string } | null>(
    `*[_type == "messagingNotification" && _id == $id && recipientActorId == $actorId][0]{ _id }`,
    { id: notificationId, actorId: actor.actorId }
  );
  if (!notification) return { error: "Notification not found", status: 404 };
  await sanityWriteClient.patch(notificationId).set({ isRead: true, readAt: new Date().toISOString() }).commit();
  return { ok: true };
}

async function markNotificationsRead(actor: MessagingActor, conversationId: string) {
  const ids = await sanityServer.fetch<string[]>(
    `*[_type == "messagingNotification" && recipientActorId == $actorId && entityId == $conversationId && isRead != true]._id`,
    { actorId: actor.actorId, conversationId }
  );
  await Promise.all(ids.map((id) => sanityWriteClient.patch(id).set({ isRead: true, readAt: new Date().toISOString() }).commit()));
}

async function notifyAdminsForClientMessage(conversationId: string, title: string, actor: Extract<MessagingActor, { kind: "client" }>, body: string) {
  const now = new Date().toISOString();
  const staff = await sanityServer.fetch<Array<{ _id: string; name: string; email: string; roleSlug: string; status: string }>>(
    `*[_type == "staffMember" && status == "active"]{ _id, name, email, roleSlug, status }`
  );

  const recipients = [
    { actorId: "admin:owner", userId: null, name: "Owner", email: process.env.ADMIN_USERNAME ?? "owner" },
    ...staff.map((item) => ({
      actorId: `admin:${item._id}`,
      userId: item._id,
      name: item.name,
      email: item.email,
    })),
  ];

  await Promise.all(recipients.map((recipient) =>
    sanityWriteClient.create({
      _type: "messagingNotification",
      recipientActorId: recipient.actorId,
      recipientUserId: recipient.userId,
      recipientKind: "admin",
      type: "NewMessage",
      title: `New message from ${actor.name}`,
      body: body.slice(0, 180),
      entityType: "Conversation",
      entityId: conversationId,
      isRead: false,
      createdAt: now,
      linkUrl: `/admin/messages/${conversationId}`,
    })
  ));

  await sendPushNotificationToAudience(
    {
      title: `New message from ${actor.name}`,
      body: body.slice(0, 140),
      href: `/admin/messages/${conversationId}`,
      tag: `message:${conversationId}:${now}`,
    },
    { module: "clients", action: "view" }
  ).catch((err) => console.error("MESSAGING_PUSH_ERR:", err));
}

async function notifyClientForAdminMessage(conversation: ConversationRecord, actor: Extract<MessagingActor, { kind: "admin" }>, body: string) {
  if (!conversation.clientId) return;
  await sanityWriteClient.create({
    _type: "messagingNotification",
    recipientActorId: `portal:${conversation.clientId}`,
    recipientUserId: conversation.clientId,
    recipientKind: "client",
    type: "NewMessage",
    title: `New reply from ${actor.name}`,
    body: body.slice(0, 180),
    entityType: "Conversation",
    entityId: conversation._id,
    isRead: false,
    createdAt: new Date().toISOString(),
    linkUrl: `/portal/messages?conversation=${conversation._id}`,
  });
}

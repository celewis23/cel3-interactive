import { randomUUID } from "crypto";
import { NextRequest } from "next/server";
import { sql } from "@/lib/postgres";
import { sanityServer } from "@/lib/sanityServer";
import { sendPushNotificationToAudience } from "@/lib/notifications/push";
import { MessagingActor } from "@/lib/messaging/auth";
import { logAudit } from "@/lib/audit/log";
import { createFolder, downloadFileContent, listFiles, uploadFile } from "@/lib/google/drive";

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
  clientProfileImageUrl: string | null;
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

type ParticipantRecord = {
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
};

type ConversationRecord = ConversationSummary & {
  stripeCustomerId?: string | null;
  pipelineContactId?: string | null;
  driveFolderId?: string | null;
  createdByActorId?: string;
  createdByUserId?: string | null;
  participants: ParticipantRecord[];
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

type ConversationRow = {
  id: string;
  title: string | null;
  status: string;
  type: string;
  client_id: string | null;
  client_name: string | null;
  client_email: string | null;
  client_profile_image_url: string | null;
  company: string | null;
  stripe_customer_id: string | null;
  pipeline_contact_id: string | null;
  drive_folder_id: string | null;
  created_by_actor_id: string;
  created_by_user_id: string | null;
  created_at: string | Date;
  updated_at: string | Date;
  last_message_at: string | Date;
  last_message_preview: string | null;
  last_sender_name: string | null;
};

type ParticipantRow = {
  id: string;
  conversation_id: string;
  actor_id: string;
  user_id: string | null;
  participant_kind: "admin" | "client";
  role_in_conversation: string;
  display_name: string;
  email: string | null;
  joined_at: string | Date;
  last_read_message_id: string | null;
  last_read_at: string | Date | null;
  is_muted: boolean;
  is_archived: boolean;
};

type MessageRow = {
  id: string;
  conversation_id: string;
  sender_actor_id: string;
  sender_user_id: string | null;
  sender_kind: "admin" | "client" | "system";
  sender_name: string;
  sender_email: string | null;
  sender_avatar_url: string | null;
  body: string;
  message_type: string;
  created_at: string | Date;
  updated_at: string | Date | null;
  deleted_at: string | Date | null;
};

type AttachmentRow = {
  id: string;
  message_id: string;
  conversation_id: string;
  drive_file_id: string;
  file_name: string;
  file_url: string | null;
  web_view_link: string | null;
  web_content_link: string | null;
  thumbnail_link: string | null;
  content_type: string;
  size_bytes: number | string | null;
  uploaded_by_actor_id: string;
  uploaded_by_user_id: string | null;
  created_at: string | Date;
};

type NotificationRow = {
  id: string;
  type: string;
  title: string;
  body: string;
  entity_type: string;
  entity_id: string;
  is_read: boolean;
  created_at: string | Date;
  link_url: string;
};

function toIso(value: string | Date | null | undefined) {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toISOString();
}

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

function makeParticipant(actor: MessagingActor, now: string, roleInConversation?: string): ParticipantRecord {
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

function mapParticipant(row: ParticipantRow): ParticipantRecord {
  return {
    _key: row.id,
    actorId: row.actor_id,
    userId: row.user_id,
    participantKind: row.participant_kind,
    roleInConversation: row.role_in_conversation,
    displayName: row.display_name,
    email: row.email,
    joinedAt: toIso(row.joined_at) ?? new Date().toISOString(),
    lastReadMessageId: row.last_read_message_id,
    lastReadAt: toIso(row.last_read_at),
    isMuted: row.is_muted,
    isArchived: row.is_archived,
  };
}

function mapConversation(row: ConversationRow, participants: ParticipantRecord[] = []): ConversationRecord {
  return {
    _id: row.id,
    title: row.title,
    status: row.status,
    type: row.type,
    clientId: row.client_id,
    clientName: row.client_name,
    clientEmail: row.client_email,
    clientProfileImageUrl: row.client_profile_image_url,
    company: row.company,
    stripeCustomerId: row.stripe_customer_id,
    pipelineContactId: row.pipeline_contact_id,
    driveFolderId: row.drive_folder_id,
    createdByActorId: row.created_by_actor_id,
    createdByUserId: row.created_by_user_id,
    createdAt: toIso(row.created_at) ?? new Date().toISOString(),
    updatedAt: toIso(row.updated_at) ?? new Date().toISOString(),
    lastMessageAt: toIso(row.last_message_at) ?? new Date().toISOString(),
    lastMessagePreview: row.last_message_preview,
    lastSenderName: row.last_sender_name,
    unreadCount: 0,
    participantCount: participants.length,
    participants,
  };
}

function mapAttachment(row: AttachmentRow): MessageAttachment {
  return {
    _key: row.id,
    driveFileId: row.drive_file_id,
    fileName: row.file_name,
    fileUrl: row.file_url,
    webViewLink: row.web_view_link,
    webContentLink: row.web_content_link,
    thumbnailLink: row.thumbnail_link,
    contentType: row.content_type,
    size: row.size_bytes === null ? null : Number(row.size_bytes),
    uploadedByActorId: row.uploaded_by_actor_id,
    uploadedByUserId: row.uploaded_by_user_id,
    createdAt: toIso(row.created_at) ?? new Date().toISOString(),
  };
}

function mapMessage(row: MessageRow, attachments: MessageAttachment[] = []): MessageRecord {
  return {
    _id: row.id,
    conversationId: row.conversation_id,
    senderActorId: row.sender_actor_id,
    senderUserId: row.sender_user_id,
    senderKind: row.sender_kind,
    senderName: row.sender_name,
    senderEmail: row.sender_email,
    senderAvatarUrl: row.sender_avatar_url,
    body: row.body,
    messageType: row.message_type,
    createdAt: toIso(row.created_at) ?? new Date().toISOString(),
    updatedAt: toIso(row.updated_at),
    deletedAt: toIso(row.deleted_at),
    attachments,
  };
}

function mapNotification(row: NotificationRow) {
  return {
    _id: row.id,
    type: row.type,
    title: row.title,
    body: row.body,
    entityType: row.entity_type,
    entityId: row.entity_id,
    isRead: row.is_read,
    createdAt: toIso(row.created_at) ?? new Date().toISOString(),
    linkUrl: row.link_url,
  };
}

async function fetchParticipants(conversationIds: string[]) {
  if (conversationIds.length === 0) return new Map<string, ParticipantRecord[]>();
  const rows = await sql.query<ParticipantRow>(
    `SELECT * FROM messaging_conversation_participants WHERE conversation_id = ANY($1::text[]) ORDER BY joined_at ASC`,
    [conversationIds]
  );
  const byConversation = new Map<string, ParticipantRecord[]>();
  for (const row of rows) {
    const current = byConversation.get(row.conversation_id) ?? [];
    current.push(mapParticipant(row));
    byConversation.set(row.conversation_id, current);
  }
  return byConversation;
}

async function fetchAttachments(messageIds: string[]) {
  if (messageIds.length === 0) return new Map<string, MessageAttachment[]>();
  const rows = await sql.query<AttachmentRow>(
    `SELECT * FROM messaging_message_attachments WHERE message_id = ANY($1::text[]) ORDER BY created_at ASC`,
    [messageIds]
  );
  const byMessage = new Map<string, MessageAttachment[]>();
  for (const row of rows) {
    const current = byMessage.get(row.message_id) ?? [];
    current.push(mapAttachment(row));
    byMessage.set(row.message_id, current);
  }
  return byMessage;
}

async function fetchMessagesForConversations(conversationIds: string[]) {
  if (conversationIds.length === 0) return new Map<string, MessageRecord[]>();
  const rows = await sql.query<MessageRow>(
    `SELECT * FROM messaging_messages WHERE conversation_id = ANY($1::text[]) AND deleted_at IS NULL ORDER BY created_at ASC`,
    [conversationIds]
  );
  const attachments = await fetchAttachments(rows.map((row) => row.id));
  const byConversation = new Map<string, MessageRecord[]>();
  for (const row of rows) {
    const current = byConversation.get(row.conversation_id) ?? [];
    current.push(mapMessage(row, attachments.get(row.id) ?? []));
    byConversation.set(row.conversation_id, current);
  }
  return byConversation;
}

async function fetchConversation(conversationId: string) {
  const rows = await sql.query<ConversationRow>(
    `SELECT * FROM messaging_conversations WHERE id = $1 LIMIT 1`,
    [conversationId]
  );
  const row = rows[0];
  if (!row) return null;
  const participants = await fetchParticipants([conversationId]);
  return mapConversation(row, participants.get(conversationId) ?? []);
}

async function fetchClientProfileImages(clientIds: Array<string | null>) {
  const ids = [...new Set(clientIds.filter((id): id is string => Boolean(id)))];
  if (ids.length === 0) return new Map<string, string | null>();

  const users = await sanityServer.fetch<Array<{ _id: string; profileImageUrl: string | null }>>(
    `*[_type == "clientPortalUser" && _id in $ids]{ _id, profileImageUrl }`,
    { ids }
  );
  return new Map(users.map((user) => [user._id, user.profileImageUrl ?? null]));
}

async function hydrateMessageAvatars(messages: MessageRecord[]) {
  const portalIds = new Set<string>();
  const staffIds = new Set<string>();
  let needsOwner = false;

  for (const message of messages) {
    if (message.senderActorId.startsWith("portal:")) {
      portalIds.add(message.senderActorId.replace("portal:", ""));
    } else if (message.senderActorId === "admin:owner") {
      needsOwner = true;
    } else if (message.senderActorId.startsWith("admin:")) {
      staffIds.add(message.senderActorId.replace("admin:", ""));
    }
  }

  const [portalUsers, staffUsers, ownerSettings] = await Promise.all([
    portalIds.size
      ? sanityServer.fetch<Array<{ _id: string; profileImageUrl: string | null }>>(
          `*[_type == "clientPortalUser" && _id in $ids]{ _id, profileImageUrl }`,
          { ids: Array.from(portalIds) }
        )
      : Promise.resolve([]),
    staffIds.size
      ? sanityServer.fetch<Array<{ _id: string; profileImageUrl: string | null }>>(
          `*[_type == "staffMember" && _id in $ids]{ _id, profileImageUrl }`,
          { ids: Array.from(staffIds) }
        )
      : Promise.resolve([]),
    needsOwner
      ? sanityServer.fetch<{ ownerProfileImageUrl?: string | null } | null>(
          `*[_type == "siteSettings"][0]{ ownerProfileImageUrl }`
        )
      : Promise.resolve(null),
  ]);

  const currentAvatars = new Map<string, string | null>();
  for (const user of portalUsers) currentAvatars.set(`portal:${user._id}`, user.profileImageUrl ?? null);
  for (const user of staffUsers) currentAvatars.set(`admin:${user._id}`, user.profileImageUrl ?? null);
  if (needsOwner) currentAvatars.set("admin:owner", ownerSettings?.ownerProfileImageUrl ?? null);

  return messages.map((message) => ({
    ...message,
    senderAvatarUrl: currentAvatars.has(message.senderActorId)
      ? currentAvatars.get(message.senderActorId) ?? null
      : message.senderAvatarUrl ?? null,
  }));
}

function resolveClientProfileImage(conversation: ConversationSummary, currentImages: Map<string, string | null>) {
  if (conversation.clientId && currentImages.has(conversation.clientId)) {
    return currentImages.get(conversation.clientId) ?? null;
  }
  return conversation.clientProfileImageUrl ?? null;
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

async function insertParticipant(conversationId: string, participant: ParticipantRecord) {
  await sql.query(
    `INSERT INTO messaging_conversation_participants (
      id, conversation_id, actor_id, user_id, participant_kind, role_in_conversation,
      display_name, email, joined_at, last_read_message_id, last_read_at, is_muted, is_archived
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
    ON CONFLICT (conversation_id, actor_id) DO NOTHING`,
    [
      participant._key,
      conversationId,
      participant.actorId,
      participant.userId,
      participant.participantKind,
      participant.roleInConversation,
      participant.displayName,
      participant.email,
      participant.joinedAt,
      participant.lastReadMessageId,
      participant.lastReadAt,
      participant.isMuted,
      participant.isArchived,
    ]
  );
}

export async function listConversations(actor: MessagingActor, search?: string): Promise<ConversationSummary[]> {
  const params: unknown[] = [];
  const where: string[] = [];

  if (actor.kind !== "admin") {
    params.push(actor.userId, actor.actorId);
    where.push(`(client_id = $1 OR EXISTS (
      SELECT 1 FROM messaging_conversation_participants p
      WHERE p.conversation_id = messaging_conversations.id AND p.actor_id = $2
    ))`);
  }

  const query = search?.trim();
  if (query) {
    params.push(`%${query}%`);
    const index = params.length;
    where.push(`(title ILIKE $${index} OR client_name ILIKE $${index} OR client_email ILIKE $${index} OR company ILIKE $${index} OR last_message_preview ILIKE $${index})`);
  }

  const rows = await sql.query<ConversationRow>(
    `SELECT * FROM messaging_conversations
     ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
     ORDER BY last_message_at DESC, updated_at DESC
     LIMIT 100`,
    params
  );

  const participantsByConversation = await fetchParticipants(rows.map((row) => row.id));
  const conversations = rows.map((row) => mapConversation(row, participantsByConversation.get(row.id) ?? []));
  const messageGroups = await fetchMessagesForConversations(conversations.map((conversation) => conversation._id));
  const clientProfileImages = await fetchClientProfileImages(conversations.map((item) => item.clientId));

  return conversations.map((conversation) => ({
    ...conversation,
    clientProfileImageUrl: resolveClientProfileImage(conversation, clientProfileImages),
    unreadCount: unreadCountFor(actor, conversation, messageGroups.get(conversation._id) ?? []),
  }));
}

export async function getConversation(actor: MessagingActor, conversationId: string) {
  const conversation = await fetchConversation(conversationId);
  if (!actorCanAccessConversation(actor, conversation)) return null;

  const messageGroups = await fetchMessagesForConversations([conversationId]);
  const messages = messageGroups.get(conversationId) ?? [];
  const hydratedMessages = await hydrateMessageAvatars(messages);
  const clientProfileImages = await fetchClientProfileImages([conversation!.clientId]);

  return {
    conversation: {
      ...conversation!,
      clientProfileImageUrl: resolveClientProfileImage(conversation!, clientProfileImages),
      unreadCount: unreadCountFor(actor, conversation!, hydratedMessages),
    },
    messages: hydratedMessages,
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

async function createMessageDocument(
  conversationId: string,
  actor: MessagingActor,
  body: string,
  now = new Date().toISOString(),
  attachments: MessageAttachment[] = []
) {
  const id = randomUUID();
  const messageType = attachments.length > 0 && !body ? "Attachment" : "Text";
  await sql.query(
    `INSERT INTO messaging_messages (
      id, conversation_id, sender_actor_id, sender_user_id, sender_kind,
      sender_name, sender_email, sender_avatar_url, body, message_type,
      metadata, created_at, updated_at, deleted_at
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
    [
      id,
      conversationId,
      actor.actorId,
      actor.userId,
      actor.kind,
      actor.name,
      actor.email,
      actor.avatarUrl,
      body,
      messageType,
      null,
      now,
      null,
      null,
    ]
  );

  for (const attachment of attachments) {
    await sql.query(
      `INSERT INTO messaging_message_attachments (
        id, message_id, conversation_id, drive_file_id, file_name, file_url,
        web_view_link, web_content_link, thumbnail_link, content_type, size_bytes,
        uploaded_by_actor_id, uploaded_by_user_id, created_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
      [
        attachment._key,
        id,
        conversationId,
        attachment.driveFileId,
        attachment.fileName,
        attachment.fileUrl,
        attachment.webViewLink,
        attachment.webContentLink,
        attachment.thumbnailLink,
        attachment.contentType,
        attachment.size,
        attachment.uploadedByActorId,
        attachment.uploadedByUserId,
        attachment.createdAt,
      ]
    );
  }

  return {
    _id: id,
    conversationId,
    senderActorId: actor.actorId,
    senderUserId: actor.userId,
    senderKind: actor.kind,
    senderName: actor.name,
    senderEmail: actor.email,
    senderAvatarUrl: actor.avatarUrl,
    body,
    messageType,
    createdAt: now,
    updatedAt: null,
    deletedAt: null,
    attachments,
  } satisfies MessageRecord;
}

function messagePreview(body: string, attachments: MessageAttachment[]) {
  if (body) return body;
  if (attachments.length === 1) return `Sent ${attachments[0].fileName}`;
  return `Sent ${attachments.length} attachments`;
}

export async function startConversation(
  actor: MessagingActor,
  input: { title?: unknown; body?: unknown },
  req?: NextRequest,
  attachmentInputs: MessageAttachmentInput[] = []
) {
  if (actor.kind !== "client") throw new Error("Only portal users can start client conversations");

  const validation = validateMessageBody(input.body, { allowEmpty: attachmentInputs.length > 0 });
  if (!validation.ok) return { error: validation.error };
  const attachmentValidation = validateAttachments(attachmentInputs);
  if (!attachmentValidation.ok) return { error: attachmentValidation.error, status: 400 };

  const now = new Date().toISOString();
  const title = String(input.title ?? "").trim().slice(0, 120) || "Client message";
  const conversationId = randomUUID();
  const clientParticipant = makeParticipant(actor, now, "Client");
  const conversation: ConversationRecord = {
    _id: conversationId,
    title,
    status: "open",
    type: "ClientSupport",
    clientId: actor.userId,
    clientName: actor.name,
    clientEmail: actor.email,
    clientProfileImageUrl: actor.avatarUrl,
    company: actor.company,
    stripeCustomerId: actor.stripeCustomerId,
    pipelineContactId: actor.pipelineContactId,
    driveFolderId: null,
    createdByActorId: actor.actorId,
    createdByUserId: actor.userId,
    createdAt: now,
    updatedAt: now,
    lastMessageAt: now,
    lastMessagePreview: null,
    lastSenderName: actor.name,
    unreadCount: 0,
    participantCount: 1,
    participants: [clientParticipant],
  };

  await sql.query(
    `INSERT INTO messaging_conversations (
      id, title, status, type, client_id, client_name, client_email, client_profile_image_url,
      company, stripe_customer_id, pipeline_contact_id, created_by_actor_id, created_by_user_id,
      created_at, updated_at, last_message_at, last_message_preview, last_sender_name
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)`,
    [
      conversationId,
      title,
      "open",
      "ClientSupport",
      actor.userId,
      actor.name,
      actor.email,
      actor.avatarUrl,
      actor.company,
      actor.stripeCustomerId,
      actor.pipelineContactId,
      actor.actorId,
      actor.userId,
      now,
      now,
      now,
      validation.body.slice(0, 180),
      actor.name,
    ]
  );
  await insertParticipant(conversationId, clientParticipant);

  const uploadResult = await uploadConversationAttachments(conversation, actor, attachmentInputs, now);
  if (uploadResult.error) return { error: uploadResult.error, status: uploadResult.status ?? 400 };

  const attachments = uploadResult.attachments ?? [];
  const preview = messagePreview(validation.body, attachments);
  const message = await createMessageDocument(conversationId, actor, validation.body, now, attachments);
  await sql.query(
    `UPDATE messaging_conversations
     SET last_message_preview = $1, updated_at = $2, last_message_at = $2
     WHERE id = $3`,
    [preview.slice(0, 180), now, conversationId]
  );
  await notifyAdminsForClientMessage(conversationId, title, actor, preview);

  if (req) {
    logAudit(req, {
      action: "messaging.conversation_created",
      resourceType: "messagingConversation",
      resourceId: conversationId,
      resourceLabel: title,
      description: `${actor.name} started a client conversation`,
    }, { userId: actor.userId, userName: actor.name, userEmail: actor.email, isOwner: false });
  }

  return {
    conversation: {
      ...conversation,
      lastMessagePreview: preview.slice(0, 180),
      unreadCount: 0,
      participantCount: 1,
    },
    message,
  };
}

export async function startAdminConversation(
  actor: MessagingActor,
  input: { title?: unknown; body?: unknown; portalUserId?: unknown },
  req?: NextRequest,
  attachmentInputs: MessageAttachmentInput[] = []
) {
  if (actor.kind !== "admin") return { error: "Only admin users can start client conversations", status: 403 };

  const portalUserId = String(input.portalUserId ?? "").trim();
  if (!portalUserId) return { error: "portalUserId is required", status: 400 };

  const validation = validateMessageBody(input.body, { allowEmpty: attachmentInputs.length > 0 });
  if (!validation.ok) return { error: validation.error, status: 400 };
  const attachmentValidation = validateAttachments(attachmentInputs);
  if (!attachmentValidation.ok) return { error: attachmentValidation.error, status: 400 };

  const client = await sanityServer.fetch<MessageablePortalUser | null>(
    `*[_type == "clientPortalUser" && _id == $id && status != "suspended"][0]{
      _id, email, name, company, profileImageUrl, stripeCustomerId, pipelineContactId, driveRootFolderId, status
    }`,
    { id: portalUserId }
  );
  if (!client) return { error: "Portal user not found", status: 404 };

  const now = new Date().toISOString();
  const conversationId = randomUUID();
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

  await sql.query(
    `INSERT INTO messaging_conversations (
      id, title, status, type, client_id, client_name, client_email, client_profile_image_url,
      company, stripe_customer_id, pipeline_contact_id, created_by_actor_id, created_by_user_id,
      created_at, updated_at, last_message_at, last_message_preview, last_sender_name
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)`,
    [
      conversationId,
      title,
      "open",
      "ClientSupport",
      client._id,
      clientName,
      client.email,
      client.profileImageUrl ?? null,
      client.company,
      client.stripeCustomerId,
      client.pipelineContactId,
      actor.actorId,
      actor.userId,
      now,
      now,
      now,
      validation.body.slice(0, 180),
      actor.name,
    ]
  );
  await insertParticipant(conversationId, adminParticipant);
  await insertParticipant(conversationId, clientParticipant);

  const conversation: ConversationRecord = {
    _id: conversationId,
    title,
    status: "open",
    type: "ClientSupport",
    clientId: client._id,
    clientName,
    clientEmail: client.email,
    clientProfileImageUrl: client.profileImageUrl ?? null,
    company: client.company,
    createdAt: now,
    updatedAt: now,
    lastMessageAt: now,
    lastMessagePreview: null,
    lastSenderName: actor.name,
    unreadCount: 0,
    participantCount: 2,
    participants: [adminParticipant, clientParticipant],
  };

  const uploadResult = await uploadConversationAttachments(conversation, actor, attachmentInputs, now);
  if (uploadResult.error) return { error: uploadResult.error, status: uploadResult.status ?? 400 };

  const attachments = uploadResult.attachments ?? [];
  const preview = messagePreview(validation.body, attachments);
  const message = await createMessageDocument(conversationId, actor, validation.body, now, attachments);
  conversation.lastMessagePreview = preview.slice(0, 180);
  await sql.query(
    `UPDATE messaging_conversations
     SET last_message_preview = $1, updated_at = $2, last_message_at = $2
     WHERE id = $3`,
    [conversation.lastMessagePreview, now, conversationId]
  );
  await notifyClientForAdminMessage(conversation, actor, preview);

  if (req) {
    logAudit(req, {
      action: "messaging.conversation_created",
      resourceType: "messagingConversation",
      resourceId: conversationId,
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

    attachments.push({
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
    });
  }

  await sql.query(
    `UPDATE messaging_conversations SET drive_folder_id = $1, updated_at = $2 WHERE id = $3`,
    [conversationFolder.id, now, conversation._id]
  );

  return { attachments };
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

  const preview = messagePreview(validation.body, attachments);
  const message = await createMessageDocument(conversationId, actor, validation.body, now, attachments);

  await sql.query(
    `UPDATE messaging_conversations
     SET updated_at = $1, last_message_at = $1, last_message_preview = $2, last_sender_name = $3,
         client_profile_image_url = CASE WHEN $4::boolean THEN $5 ELSE client_profile_image_url END
     WHERE id = $6`,
    [now, preview.slice(0, 180), actor.name, actor.kind === "client", actor.avatarUrl, conversationId]
  );

  const hasParticipant = conversation!.participants?.some((participant) => participant.actorId === actor.actorId);
  if (!hasParticipant) await insertParticipant(conversationId, makeParticipant(actor, now));

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

  const latestRows = await sql.query<{ id: string; created_at: string | Date }>(
    `SELECT id, created_at FROM messaging_messages WHERE conversation_id = $1 AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 1`,
    [conversationId]
  );
  const latest = latestRows[0] ?? null;
  const now = new Date().toISOString();
  const participant = conversation!.participants?.find((item) => item.actorId === actor.actorId);

  if (participant?._key) {
    await sql.query(
      `UPDATE messaging_conversation_participants
       SET last_read_at = $1, last_read_message_id = $2
       WHERE id = $3`,
      [now, latest?.id ?? null, participant._key]
    );
  } else {
    await insertParticipant(conversationId, {
      ...makeParticipant(actor, now),
      lastReadAt: now,
      lastReadMessageId: latest?.id ?? null,
    });
  }

  await markNotificationsRead(actor, conversationId);
  return { ok: true };
}

export async function getMessageAttachmentFile(actor: MessagingActor, driveFileId: string) {
  const rows = await sql.query<AttachmentRow>(
    `SELECT * FROM messaging_message_attachments WHERE drive_file_id = $1 LIMIT 1`,
    [driveFileId]
  );
  const row = rows[0];
  if (!row) return { error: "Attachment not found", status: 404 };

  const conversation = await fetchConversation(row.conversation_id);
  if (!actorCanAccessConversation(actor, conversation)) {
    return { error: "Attachment not found", status: 404 };
  }

  const file = await downloadFileContent(row.drive_file_id);
  return {
    data: file.data,
    name: file.name || row.file_name,
    mimeType: file.mimeType || row.content_type || "application/octet-stream",
  };
}

export async function getUnreadCount(actor: MessagingActor) {
  const conversations = await listConversations(actor);
  return conversations.reduce((sum, item) => sum + item.unreadCount, 0);
}

export async function listNotifications(actor: MessagingActor) {
  const rows = await sql.query<NotificationRow>(
    `SELECT id, type, title, body, entity_type, entity_id, is_read, created_at, link_url
     FROM messaging_notifications
     WHERE recipient_actor_id = $1
     ORDER BY created_at DESC
     LIMIT 50`,
    [actor.actorId]
  );
  return rows.map(mapNotification);
}

export async function listUnreadMessageNotifications(actorId: string, limit = 8) {
  const rows = await sql.query<NotificationRow>(
    `SELECT id, type, title, body, entity_type, entity_id, is_read, created_at, link_url
     FROM messaging_notifications
     WHERE recipient_actor_id = $1 AND is_read = false
     ORDER BY created_at DESC
     LIMIT $2`,
    [actorId, limit]
  );
  return rows.map(mapNotification);
}

export async function markNotificationRead(actor: MessagingActor, notificationId: string) {
  const rows = await sql.query<{ id: string }>(
    `UPDATE messaging_notifications
     SET is_read = true, read_at = $1
     WHERE id = $2 AND recipient_actor_id = $3
     RETURNING id`,
    [new Date().toISOString(), notificationId, actor.actorId]
  );
  if (!rows[0]) return { error: "Notification not found", status: 404 };
  return { ok: true };
}

async function markNotificationsRead(actor: MessagingActor, conversationId: string) {
  await sql.query(
    `UPDATE messaging_notifications
     SET is_read = true, read_at = $1
     WHERE recipient_actor_id = $2 AND entity_id = $3 AND is_read = false`,
    [new Date().toISOString(), actor.actorId, conversationId]
  );
}

async function createNotification(params: {
  recipientActorId: string;
  recipientUserId: string | null;
  recipientKind: "admin" | "client";
  title: string;
  body: string;
  entityId: string;
  linkUrl: string;
}) {
  await sql.query(
    `INSERT INTO messaging_notifications (
      id, recipient_actor_id, recipient_user_id, recipient_kind, type, title,
      body, entity_type, entity_id, is_read, created_at, link_url
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
    [
      randomUUID(),
      params.recipientActorId,
      params.recipientUserId,
      params.recipientKind,
      "NewMessage",
      params.title,
      params.body.slice(0, 180),
      "Conversation",
      params.entityId,
      false,
      new Date().toISOString(),
      params.linkUrl,
    ]
  );
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
    createNotification({
      recipientActorId: recipient.actorId,
      recipientUserId: recipient.userId,
      recipientKind: "admin",
      title: `New message from ${actor.name}`,
      body,
      entityId: conversationId,
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
  await createNotification({
    recipientActorId: `portal:${conversation.clientId}`,
    recipientUserId: conversation.clientId,
    recipientKind: "client",
    title: `New reply from ${actor.name}`,
    body,
    entityId: conversation._id,
    linkUrl: `/portal/messages?conversation=${conversation._id}`,
  });
}

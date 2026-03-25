import { google } from "googleapis";
import type { gmail_v1 } from "googleapis";
import { getAuthenticatedClient } from "./client";
import type {
  GmailMessageParsed,
  GmailThreadSummary,
  GmailThreadDetail,
  GmailLabel,
  GmailProfile,
} from "./types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getHeader(
  headers: gmail_v1.Schema$MessagePartHeader[],
  name: string
): string {
  return (
    headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value ??
    ""
  );
}

function decodeBase64Url(data: string): string {
  try {
    return Buffer.from(
      data.replace(/-/g, "+").replace(/_/g, "/"),
      "base64"
    ).toString("utf-8");
  } catch {
    return "";
  }
}

import type { GmailAttachment } from "./types";

function extractParts(
  payload: gmail_v1.Schema$MessagePart,
  result: { text: string; html: string | null; attachments: GmailAttachment[] }
): void {
  if (!payload) return;

  const disposition = payload.headers
    ?.find((h) => h.name?.toLowerCase() === "content-disposition")
    ?.value?.toLowerCase() ?? "";
  const contentId = (
    payload.headers
      ?.find((h) => h.name?.toLowerCase() === "content-id")
      ?.value ?? ""
  ).replace(/^<|>$/g, "");
  const isInline = disposition.startsWith("inline");
  const isAttachment = disposition.startsWith("attachment");
  const hasAttachmentId = !!payload.body?.attachmentId;
  const filename = payload.filename ?? "";

  // Collect attachments and inline parts that have an attachmentId
  if (hasAttachmentId && (isAttachment || isInline || filename)) {
    result.attachments.push({
      attachmentId: payload.body!.attachmentId!,
      filename: filename || `attachment`,
      mimeType: payload.mimeType ?? "application/octet-stream",
      size: payload.body?.size ?? 0,
      contentId: contentId || undefined,
      inline: isInline && !!contentId,
    });
    return;
  }

  if (payload.mimeType === "text/plain" && payload.body?.data) {
    if (!result.text) result.text = decodeBase64Url(payload.body.data);
    return;
  }
  if (payload.mimeType === "text/html" && payload.body?.data) {
    if (!result.html) result.html = decodeBase64Url(payload.body.data);
    return;
  }

  if (payload.parts) {
    for (const part of payload.parts) {
      extractParts(part, result);
    }
  }
}

function extractBody(payload: gmail_v1.Schema$MessagePart): {
  text: string;
  html: string | null;
  attachments: GmailAttachment[];
} {
  const result: { text: string; html: string | null; attachments: GmailAttachment[] } = {
    text: "",
    html: null,
    attachments: [],
  };
  extractParts(payload, result);
  return result;
}

function parseMessage(msg: gmail_v1.Schema$Message): GmailMessageParsed {
  const headers = msg.payload?.headers ?? [];
  const { text, html, attachments } = extractBody(msg.payload ?? {});
  const labelIds = msg.labelIds ?? [];

  return {
    id: msg.id ?? "",
    threadId: msg.threadId ?? "",
    labelIds,
    snippet: msg.snippet ?? "",
    internalDate: parseInt(msg.internalDate ?? "0", 10),
    headers: {
      from: getHeader(headers, "From"),
      to: getHeader(headers, "To"),
      cc: getHeader(headers, "Cc"),
      subject: getHeader(headers, "Subject"),
      date: getHeader(headers, "Date"),
      messageId: getHeader(headers, "Message-ID"),
      inReplyTo: getHeader(headers, "In-Reply-To"),
      references: getHeader(headers, "References"),
    },
    bodyText: text,
    bodyHtml: html,
    isRead: !labelIds.includes("UNREAD"),
    attachments,
  };
}

async function getGmail() {
  const auth = await getAuthenticatedClient();
  if (!auth) throw new Error("Gmail not connected");
  return {
    gmail: google.gmail({ version: "v1", auth: auth.oauth2Client }),
    email: auth.email,
  };
}

// ─── Public API ────────────────────────────────────────────────────────────────

export async function getProfile(): Promise<GmailProfile> {
  const { gmail } = await getGmail();
  const res = await gmail.users.getProfile({ userId: "me" });
  return {
    emailAddress: res.data.emailAddress ?? "",
    messagesTotal: res.data.messagesTotal ?? 0,
    threadsTotal: res.data.threadsTotal ?? 0,
    historyId: res.data.historyId ?? "",
  };
}

export async function listThreads(opts: {
  labelIds?: string[];
  q?: string;
  pageToken?: string;
  maxResults?: number;
}): Promise<{
  threads: GmailThreadSummary[];
  nextPageToken?: string;
  resultSizeEstimate: number;
}> {
  const { gmail } = await getGmail();
  const showRecipients = !!opts.labelIds?.includes("SENT") && !opts.labelIds?.includes("INBOX");

  const listRes = await gmail.users.threads.list({
    userId: "me",
    labelIds: opts.labelIds,
    q: opts.q,
    pageToken: opts.pageToken,
    maxResults: opts.maxResults ?? 20,
  });

  const threadRefs = listRes.data.threads ?? [];
  if (threadRefs.length === 0) {
    return { threads: [], nextPageToken: undefined, resultSizeEstimate: 0 };
  }

  const threads = await Promise.all(
    threadRefs.map(async (t) => {
      const res = await gmail.users.threads.get({
        userId: "me",
        id: t.id!,
        format: "metadata",
        metadataHeaders: ["From", "To", "Subject", "Date"],
      });
      const messages = res.data.messages ?? [];
      const lastMsg = messages[messages.length - 1];
      const headers = lastMsg?.payload?.headers ?? [];
      const allLabelIds = messages.flatMap((m) => m.labelIds ?? []);
      const from = getHeader(headers, "From");
      const to = getHeader(headers, "To");
      return {
        id: t.id ?? "",
        snippet: res.data.snippet ?? "",
        historyId: res.data.historyId ?? "",
        messageCount: messages.length,
        subject: getHeader(headers, "Subject") || "(no subject)",
        from,
        to,
        participant: showRecipients ? (to || from) : (from || to),
        date: parseInt(lastMsg?.internalDate ?? "0", 10),
        isRead: !allLabelIds.includes("UNREAD"),
        labelIds: [...new Set(allLabelIds)],
      } as GmailThreadSummary;
    })
  );

  return {
    threads,
    nextPageToken: listRes.data.nextPageToken ?? undefined,
    resultSizeEstimate: listRes.data.resultSizeEstimate ?? 0,
  };
}

export async function getThread(threadId: string): Promise<GmailThreadDetail> {
  const { gmail } = await getGmail();
  const res = await gmail.users.threads.get({
    userId: "me",
    id: threadId,
    format: "full",
  });
  return {
    id: res.data.id ?? "",
    historyId: res.data.historyId ?? "",
    snippet: res.data.snippet ?? "",
    messages: (res.data.messages ?? []).map(parseMessage),
  };
}

export async function markThreadRead(threadId: string): Promise<void> {
  const { gmail } = await getGmail();
  await gmail.users.threads.modify({
    userId: "me",
    id: threadId,
    requestBody: { removeLabelIds: ["UNREAD"] },
  });
}

export async function listLabels(): Promise<GmailLabel[]> {
  const { gmail } = await getGmail();
  const res = await gmail.users.labels.list({ userId: "me" });
  return (res.data.labels ?? []).map((l) => ({
    id: l.id ?? "",
    name: l.name ?? "",
    type: l.type ?? "",
    messagesTotal: l.messagesTotal,
    messagesUnread: l.messagesUnread,
    threadsTotal: l.threadsTotal,
    threadsUnread: l.threadsUnread,
  }));
}

export async function getUnreadCount(): Promise<number> {
  const { gmail } = await getGmail();
  try {
    const res = await gmail.users.labels.get({ userId: "me", id: "INBOX" });
    return res.data.messagesUnread ?? 0;
  } catch {
    return 0;
  }
}

export interface MimeAttachment {
  filename: string;
  mimeType: string;
  data: Buffer;
}

function htmlToPlainText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<li[^>]*>/gi, "  • ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** RFC 2047 encode a header value when it contains non-ASCII characters */
function encodeHeader(value: string): string {
  // eslint-disable-next-line no-control-regex
  if (!/[^\x00-\x7F]/.test(value)) return value;
  return `=?UTF-8?B?${Buffer.from(value, "utf-8").toString("base64")}?=`;
}

function buildRawMessage(opts: {
  to: string;
  from: string;
  subject: string;
  body: string;
  htmlBody?: string;
  cc?: string;
  bcc?: string;
  inReplyTo?: string;
  references?: string;
  attachments?: MimeAttachment[];
}): string {
  const uid = Date.now().toString(36);
  const B_ALT = `alt_${uid}`;
  const B_MIX = `mix_${uid}`;

  const hasHtml = !!opts.htmlBody;
  const hasAttachments = !!(opts.attachments?.length);

  let topContentType: string;
  if (hasAttachments) {
    topContentType = `multipart/mixed; boundary="${B_MIX}"`;
  } else if (hasHtml) {
    topContentType = `multipart/alternative; boundary="${B_ALT}"`;
  } else {
    topContentType = "text/plain; charset=UTF-8";
  }

  const headerLines = [
    `To: ${opts.to}`,
    `From: ${opts.from}`,
    ...(opts.cc ? [`Cc: ${opts.cc}`] : []),
    ...(opts.bcc ? [`Bcc: ${opts.bcc}`] : []),
    `Subject: ${encodeHeader(opts.subject)}`,
    ...(opts.inReplyTo ? [`In-Reply-To: ${opts.inReplyTo}`] : []),
    ...(opts.references ? [`References: ${opts.references}`] : []),
    "MIME-Version: 1.0",
    `Content-Type: ${topContentType}`,
  ].join("\r\n");

  // Build the alt block (text + html)
  const altBlock = hasHtml
    ? [
        `--${B_ALT}`,
        "Content-Type: text/plain; charset=UTF-8",
        "",
        opts.body,
        "",
        `--${B_ALT}`,
        "Content-Type: text/html; charset=UTF-8",
        "",
        opts.htmlBody,
        "",
        `--${B_ALT}--`,
      ].join("\r\n")
    : null;

  let bodyContent: string;
  if (hasAttachments) {
    const innerPart = hasHtml
      ? [`Content-Type: multipart/alternative; boundary="${B_ALT}"`, "", altBlock!].join("\r\n")
      : ["Content-Type: text/plain; charset=UTF-8", "", opts.body].join("\r\n");

    const parts: string[] = [`--${B_MIX}`, innerPart];

    for (const att of opts.attachments!) {
      const b64 = att.data.toString("base64");
      const wrapped = b64.match(/.{1,76}/g)?.join("\r\n") ?? b64;
      parts.push(
        `--${B_MIX}`,
        `Content-Type: ${att.mimeType}; name="${att.filename}"`,
        `Content-Disposition: attachment; filename="${att.filename}"`,
        "Content-Transfer-Encoding: base64",
        "",
        wrapped,
      );
    }
    parts.push(`--${B_MIX}--`);
    bodyContent = parts.join("\r\n");
  } else if (hasHtml) {
    bodyContent = altBlock!;
  } else {
    bodyContent = opts.body;
  }

  return Buffer.from(`${headerLines}\r\n\r\n${bodyContent}`).toString("base64url");
}

export async function sendEmail(opts: {
  to: string;
  subject: string;
  body?: string;
  htmlBody?: string;
  cc?: string;
  bcc?: string;
  attachments?: MimeAttachment[];
}): Promise<{ messageId: string; threadId: string }> {
  const { gmail, email: from } = await getGmail();
  const plainText = opts.body ?? (opts.htmlBody ? htmlToPlainText(opts.htmlBody) : "");
  const raw = buildRawMessage({
    to: opts.to,
    from,
    subject: opts.subject,
    body: plainText,
    htmlBody: opts.htmlBody,
    cc: opts.cc,
    bcc: opts.bcc,
    attachments: opts.attachments,
  });
  const res = await gmail.users.messages.send({
    userId: "me",
    requestBody: { raw },
  });
  return { messageId: res.data.id ?? "", threadId: res.data.threadId ?? "" };
}

export async function replyToThread(opts: {
  threadId: string;
  to: string;
  subject: string;
  body: string;
  htmlBody?: string;
  inReplyTo: string;
  references: string;
  cc?: string;
}): Promise<{ messageId: string; threadId: string }> {
  const { gmail, email: from } = await getGmail();
  const subject = opts.subject.startsWith("Re:")
    ? opts.subject
    : `Re: ${opts.subject}`;
  const raw = buildRawMessage({
    to: opts.to,
    from,
    subject,
    body: opts.body,
    htmlBody: opts.htmlBody,
    cc: opts.cc,
    inReplyTo: opts.inReplyTo,
    references: opts.references,
  });
  const res = await gmail.users.messages.send({
    userId: "me",
    requestBody: { raw, threadId: opts.threadId },
  });
  return { messageId: res.data.id ?? "", threadId: res.data.threadId ?? "" };
}

export async function getGmailSignature(): Promise<string | null> {
  const { gmail, email } = await getGmail();
  try {
    const res = await gmail.users.settings.sendAs.get({
      userId: "me",
      sendAsEmail: email,
    });
    return res.data.signature ?? null;
  } catch {
    // If the primary sendAs lookup fails, try listing all sendAs addresses
    try {
      const list = await gmail.users.settings.sendAs.list({ userId: "me" });
      const primary = list.data.sendAs?.find((s) => s.isPrimary);
      return primary?.signature ?? null;
    } catch {
      return null;
    }
  }
}

export async function getAttachment(
  messageId: string,
  attachmentId: string
): Promise<{ data: Buffer; size: number }> {
  const { gmail } = await getGmail();
  const res = await gmail.users.messages.attachments.get({
    userId: "me",
    messageId,
    id: attachmentId,
  });
  const raw = res.data.data ?? "";
  const buf = Buffer.from(raw.replace(/-/g, "+").replace(/_/g, "/"), "base64");
  return { data: buf, size: res.data.size ?? buf.length };
}

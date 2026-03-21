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

function extractBody(payload: gmail_v1.Schema$MessagePart): {
  text: string;
  html: string | null;
} {
  if (!payload) return { text: "", html: null };

  if (payload.mimeType === "text/plain" && payload.body?.data) {
    return { text: decodeBase64Url(payload.body.data), html: null };
  }
  if (payload.mimeType === "text/html" && payload.body?.data) {
    return { text: "", html: decodeBase64Url(payload.body.data) };
  }

  if (payload.parts) {
    let text = "";
    let html: string | null = null;
    for (const part of payload.parts) {
      if (part.mimeType === "text/plain" && part.body?.data) {
        text = decodeBase64Url(part.body.data);
      } else if (part.mimeType === "text/html" && part.body?.data) {
        html = decodeBase64Url(part.body.data);
      } else if (part.parts) {
        const nested = extractBody(part);
        if (nested.text) text = nested.text;
        if (nested.html) html = nested.html;
      }
    }
    return { text, html };
  }

  return { text: "", html: null };
}

function parseMessage(msg: gmail_v1.Schema$Message): GmailMessageParsed {
  const headers = msg.payload?.headers ?? [];
  const { text, html } = extractBody(msg.payload ?? {});
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
        metadataHeaders: ["From", "Subject", "Date"],
      });
      const messages = res.data.messages ?? [];
      const lastMsg = messages[messages.length - 1];
      const headers = lastMsg?.payload?.headers ?? [];
      const allLabelIds = messages.flatMap((m) => m.labelIds ?? []);
      return {
        id: t.id ?? "",
        snippet: res.data.snippet ?? "",
        historyId: res.data.historyId ?? "",
        messageCount: messages.length,
        subject: getHeader(headers, "Subject") || "(no subject)",
        from: getHeader(headers, "From"),
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

function buildRawMessage(opts: {
  to: string;
  from: string;
  subject: string;
  body: string;
  cc?: string;
  inReplyTo?: string;
  references?: string;
}): string {
  const lines = [
    `To: ${opts.to}`,
    `From: ${opts.from}`,
    opts.cc ? `Cc: ${opts.cc}` : null,
    `Subject: ${opts.subject}`,
    opts.inReplyTo ? `In-Reply-To: ${opts.inReplyTo}` : null,
    opts.references ? `References: ${opts.references}` : null,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=UTF-8",
    "",
    opts.body,
  ].filter(Boolean);
  return Buffer.from(lines.join("\r\n")).toString("base64url");
}

export async function sendEmail(opts: {
  to: string;
  subject: string;
  body: string;
  cc?: string;
}): Promise<{ messageId: string; threadId: string }> {
  const { gmail, email: from } = await getGmail();
  const raw = buildRawMessage({
    to: opts.to,
    from,
    subject: opts.subject,
    body: opts.body,
    cc: opts.cc,
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
